import type { DataSource, MatchLineupInput } from "@sarpbc/types";
import { beforeEach, describe, expect, it } from "vitest";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { Player } from "../../../roster/domain/player";
import { Match } from "../../domain/match";
import { TournamentParticipant } from "../../domain/tournament-participant";
import type { LineupRow } from "../../domain/match-lineup";
import type {
  CompetitionTransaction,
  CompetitionWriteScope,
  LineupWriter,
  MatchWriter,
  PlayerLineupRow,
} from "../ports";
import { MatchLineupService } from "./match-lineup.service";

const unused = (): never => {
  throw new Error("Not part of a lineup operation");
};

const player = (id: string) => Object.assign(new Player(), { id, name: id, slug: id });

const lineupPlayer = (id: string) => ({
  id,
  imageUrl: null,
  name: id,
  nationality: null,
  slug: id,
});

const participant = (id: string, rosterIds: string[]) =>
  Object.assign(new TournamentParticipant(), { id, players: rosterIds.map(player) });

const match = (id: string, source: DataSource, tournamentSource: DataSource = "manual") =>
  Object.assign(new Match(), {
    beginAt: new Date("2026-11-07T18:00:00Z"),
    id,
    participants: [
      participant("side-a", ["alpha", "bravo", "charlie"]),
      participant("side-b", ["echo", "foxtrot", "golf"]),
    ],
    source,
    tournament: {
      beginAt: null,
      event: { id: "fake-event", name: "Fake Cup", slug: "fake-cup" },
      eventStreams: [],
      id: `${id}-stage`,
      league: null,
      name: "Fake Cup",
      pandascoreId: null,
      pickemsEnabled: false,
      slug: "fake-cup",
      source: tournamentSource,
      streams: [],
    },
  });

describe(MatchLineupService, () => {
  const matches = new Map<string, Match>();
  const replaced: { matchId: string; lineups: MatchLineupInput[] }[] = [];
  let stored: LineupRow[] = [];
  let playerRows: PlayerLineupRow[] = [];
  let existing = new Set<string>();

  const matchWriter: MatchWriter = {
    bracket: unused,
    byPandascoreId: unused,
    load: async (id) => matches.get(id) ?? null,
    participants: unused,
    references: unused,
    remove: unused,
    save: unused,
    timings: unused,
    tournament: unused,
  };

  const lineupWriter: LineupWriter = {
    activePlayersExist: async (ids) => ids.every((id) => existing.has(id)),
    replace: async (matchId, lineups) => {
      replaced.push({ lineups, matchId });
    },
  };

  const scope: CompetitionWriteScope = {
    get awards() {
      return unused();
    },
    get events() {
      return unused();
    },
    lineups: lineupWriter,
    matches: matchWriter,
    get prizes() {
      return unused();
    },
    get rosters() {
      return unused();
    },
    get tournaments() {
      return unused();
    },
  };

  const transaction: CompetitionTransaction = { run: async (work) => await work(scope) };

  const byIds = async (ids: string[]) =>
    ids.flatMap((id) => {
      const found = matches.get(id);

      return found ? [found] : [];
    });

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

    for (const found of [
      match("manual-match", "manual"),
      match("pandascore-match", "pandascore"),
      match("startgg-match", "startgg", "startgg"),
      match("startgg-stage-match", "manual", "startgg"),
    ]) {
      matches.set(found.id, found);
    }
  });

  it("replaces the lineups with validated sides and returns them with stand-in badges", async () => {
    stored = [
      {
        participantId: "side-a",
        player: lineupPlayer("alpha"),
      },
      {
        participantId: "side-a",
        player: lineupPlayer("delta"),
      },
    ];

    const result = await service.set("manual-match", [
      { participantId: "side-b", playerIds: [] },
      { participantId: "side-a", playerIds: ["alpha", "delta"] },
    ]);

    expect(replaced).toStrictEqual([
      {
        lineups: [{ participantId: "side-a", playerIds: ["alpha", "delta"] }],
        matchId: "manual-match",
      },
    ]);
    expect(result).toStrictEqual({
      lineups: [
        {
          participantId: "side-a",
          players: [
            expect.objectContaining({ id: "alpha", standIn: false }),
            expect.objectContaining({ id: "delta", standIn: true }),
          ],
        },
      ],
      source: "manual",
    });
  });

  it("clears every lineup when given none", async () => {
    await service.set("manual-match", []);
    expect(replaced).toStrictEqual([{ lineups: [], matchId: "manual-match" }]);
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
    expect(replaced).toStrictEqual([]);
  });

  it("reports start.gg as the source of a start.gg match or stage", async () => {
    const findResult = await service.find("pandascore-match");
    expect(findResult.source).toBe("pandascore");
    const findResult2 = await service.find("startgg-match");
    expect(findResult2.source).toBe("startgg");
    const findResult3 = await service.find("startgg-stage-match");
    expect(findResult3.source).toBe("startgg");
  });

  it("accepts proposals for manual and PandaScore matches only", async () => {
    const lineups = [{ participantId: "side-a", playerIds: ["delta"] }];
    await expect(service.requireProposable("manual-match", lineups)).resolves.toBeUndefined();
    await expect(service.requireProposable("pandascore-match", lineups)).resolves.toBeUndefined();
    await expect(service.requireProposable("startgg-match", lineups)).rejects.toThrow("start.gg");
    await expect(service.requireProposable("startgg-stage-match", lineups)).rejects.toThrow(
      "start.gg",
    );
    expect(replaced).toStrictEqual([]);
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

      expect(
        standIns.map(({ participantId, match: { id } }) => ({ id, participantId })),
      ).toStrictEqual([
        { id: "startgg-match", participantId: "side-b" },
        { id: "manual-match", participantId: "side-a" },
      ]);
    });

    it("skips a side that no longer plays the match after a sync", async () => {
      playerRows = [{ matchId: "manual-match", participantId: "side-gone", rosterIds: [] }];
      await expect(service.standIns("delta")).resolves.toStrictEqual([]);
    });
  });
});
