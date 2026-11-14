import type { DataSource, MatchLineupInput } from "@sarpbc/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInputError, NotFoundError } from "../../../common/domain/errors";
import { Player } from "../../../roster/domain/roster";
import { Match, TournamentParticipant } from "../../domain/competition";
import type { LineupRow } from "../../domain/match-lineup";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  LineupWriter,
  MatchWriter,
  PlayerLineupRow,
} from "../ports";
import { MatchLineupService } from "./match-lineup.service";

function unused(): never {
  throw new Error("Not part of a lineup operation");
}

const player = (id: string) => Object.assign(new Player(), { id, name: id, slug: id });

function participant(id: string, rosterIds: string[]) {
  return Object.assign(new TournamentParticipant(), { id, players: rosterIds.map(player) });
}

function match(id: string, source: DataSource, tournamentSource: DataSource = "manual") {
  return Object.assign(new Match(), {
    id,
    source,
    beginAt: new Date("2026-11-07T18:00:00Z"),
    participants: [
      participant("side-a", ["alpha", "bravo", "charlie"]),
      participant("side-b", ["echo", "foxtrot", "golf"]),
    ],
    tournament: {
      id: `${id}-stage`,
      name: "Fake Cup",
      slug: "fake-cup",
      event: { id: "fake-event", slug: "fake-cup", name: "Fake Cup" },
      beginAt: null,
      league: null,
      pickemsEnabled: false,
      source: tournamentSource,
      pandascoreId: null,
      streams: [],
      eventStreams: [],
    },
  });
}

describe("MatchLineupService", () => {
  const matches = new Map<string, Match>();
  const replaced: { matchId: string; lineups: MatchLineupInput[] }[] = [];
  let stored: LineupRow[] = [];
  let playerRows: PlayerLineupRow[] = [];
  let existing = new Set<string>();

  const matchWriter: MatchWriter = {
    load: async (id) => matches.get(id) ?? null,
    byPandascoreId: unused,
    save: unused,
    timings: unused,
    tournament: unused,
    participants: unused,
    bracket: unused,
    references: unused,
    remove: unused,
  };

  const lineupWriter: LineupWriter = {
    activePlayersExist: async (ids) => ids.every((id) => existing.has(id)),
    replace: async (matchId, lineups) => {
      replaced.push({ matchId, lineups });
    },
  };

  const scope: CompetitionWriteScope = {
    matches: matchWriter,
    lineups: lineupWriter,
    get tournaments() {
      return unused();
    },
    get events() {
      return unused();
    },
    get rosters() {
      return unused();
    },
    get awards() {
      return unused();
    },
    get prizes() {
      return unused();
    },
  };

  const transaction: CompetitionTransaction = { run: async (work) => await work(scope) };

  const byIds = vi.fn(async (ids: string[]) =>
    ids.flatMap((id) => {
      const found = matches.get(id);

      return found ? [found] : [];
    }),
  );

  const service = new MatchLineupService(
    { byMatch: async () => stored, byPlayer: async () => playerRows },
    { byIds },
    transaction,
  );

  beforeEach(() => {
    matches.clear();
    replaced.length = 0;
    stored = [];
    playerRows = [];
    existing = new Set(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"]);
    byIds.mockClear();

    for (const found of [
      match("manual-match", "manual"),
      match("pandascore-match", "pandascore"),
      match("startgg-match", "startgg", "startgg"),
      match("startgg-stage-match", "manual", "startgg"),
    ])
      matches.set(found.id, found);
  });

  it("replaces the lineups with validated sides and returns them with stand-in badges", async () => {
    stored = [
      {
        participantId: "side-a",
        player: { ...player("alpha"), imageUrl: null, nationality: null },
      },
      {
        participantId: "side-a",
        player: { ...player("delta"), imageUrl: null, nationality: null },
      },
    ];

    const result = await service.set("manual-match", [
      { participantId: "side-b", playerIds: [] },
      { participantId: "side-a", playerIds: ["alpha", "delta"] },
    ]);

    expect(replaced).toEqual([
      {
        matchId: "manual-match",
        lineups: [{ participantId: "side-a", playerIds: ["alpha", "delta"] }],
      },
    ]);
    expect(result).toEqual({
      source: "manual",
      lineups: [
        {
          participantId: "side-a",
          players: [
            expect.objectContaining({ id: "alpha", standIn: false }),
            expect.objectContaining({ id: "delta", standIn: true }),
          ],
        },
      ],
    });
  });

  it("clears every lineup when given none", async () => {
    await service.set("manual-match", []);
    expect(replaced).toEqual([{ matchId: "manual-match", lineups: [] }]);
  });

  it("refuses a missing match, a foreign participant and an unknown or merged player", async () => {
    await expect(service.set("missing", [])).rejects.toThrow(NotFoundError);
    await expect(
      service.set("manual-match", [{ participantId: "side-z", playerIds: ["alpha"] }]),
    ).rejects.toThrow(InvalidInputError);
    existing.delete("delta");
    await expect(
      service.set("manual-match", [{ participantId: "side-a", playerIds: ["delta"] }]),
    ).rejects.toThrow("must exist");
    expect(replaced).toEqual([]);
  });

  it("reports start.gg as the source of a start.gg match or stage", async () => {
    expect((await service.find("pandascore-match")).source).toBe("pandascore");
    expect((await service.find("startgg-match")).source).toBe("startgg");
    expect((await service.find("startgg-stage-match")).source).toBe("startgg");
  });

  it("accepts proposals for manual and PandaScore matches only", async () => {
    const lineups = [{ participantId: "side-a", playerIds: ["delta"] }];
    await expect(service.requireProposable("manual-match", lineups)).resolves.toBeUndefined();
    await expect(service.requireProposable("pandascore-match", lineups)).resolves.toBeUndefined();
    await expect(service.requireProposable("startgg-match", lineups)).rejects.toThrow("start.gg");
    await expect(service.requireProposable("startgg-stage-match", lineups)).rejects.toThrow(
      "start.gg",
    );
    expect(replaced).toEqual([]);
  });

  describe("stand-in history", () => {
    beforeEach(() => {
      playerRows = [
        { matchId: "startgg-match", participantId: "side-b", rosterIds: ["echo", "foxtrot"] },
        { matchId: "manual-match", participantId: "side-a", rosterIds: ["alpha", "bravo"] },
        { matchId: "pandascore-match", participantId: "side-a", rosterIds: ["delta", "bravo"] },
      ];
    });

    it("lists only the series played outside the participant roster, start.gg included for the site", async () => {
      const standIns = await service.standIns("delta");

      expect(standIns.map(({ participantId, match: { id } }) => ({ participantId, id }))).toEqual([
        { participantId: "side-b", id: "startgg-match" },
        { participantId: "side-a", id: "manual-match" },
      ]);
    });

    it("skips a side that no longer plays the match after a sync", async () => {
      playerRows = [{ matchId: "manual-match", participantId: "side-gone", rosterIds: [] }];
      expect(await service.standIns("delta")).toEqual([]);
    });

    it("does not read matches for a player who never stood in", async () => {
      playerRows = [{ matchId: "manual-match", participantId: "side-a", rosterIds: ["delta"] }];
      expect(await service.standIns("delta")).toEqual([]);
      expect(byIds).not.toHaveBeenCalled();
    });
  });
});
