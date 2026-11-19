import { beforeEach, describe, expect, it } from "vitest";
import { isMatchFinished, isMatchLive } from "@sarpbc/utils";
import { Match } from "../../../tournament/domain/match";
import type { TournamentSummary } from "../../../tournament/domain/match";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant";
import { matchDecided } from "../../../tournament/domain/match-decided";
import { CompetitionAfterCommit } from "../../../tournament/application/after-commit";
import { MatchService } from "../../../tournament/application/match/match.service";
import type {
  CompetitionEvents,
  CompetitionTransaction,
} from "../../../tournament/application/ports";
import { competitionScope, matchQueries, matchWriter } from "../../../../test/competition-doubles";
import { PickemService } from "../application/pickem.service";
import { CompetitionPickemMatches } from "./competition-pickem-matches";

const now = new Date("2026-01-01T12:00:00Z");

const arrange = () => {
  const [a, b] = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));

  const stored = Object.assign(new Match(), {
    beginAt: new Date("2026-01-01T10:00:00Z"),
    id: "m",
    participants: [a, b],
    results: [
      { id: "r1", match: { id: "m" }, participant: { id: "a" }, score: 3 },
      { id: "r2", match: { id: "m" }, participant: { id: "b" }, score: 1 },
    ],
    status: "running",
    tournament: {
      beginAt: null,
      event: { id: "event", name: "Event", slug: "event" },
      eventStreams: [],
      id: "cup",
      league: null,
      name: "Cup",
      pandascoreId: null,
      pickemsEnabled: true,
      slug: "cup",
      source: "manual",
      streams: [],
    } satisfies TournamentSummary,
  });

  const saved: Match[] = [];
  const published: Parameters<CompetitionEvents["publish"]>[0][] = [];

  const writer = matchWriter({
    load: async () => stored,
    save: async (match) => {
      saved.push(match);
    },
  });

  const competition = new MatchService(
    matchQueries({ detail: async () => stored }),
    {
      run: async (work) => await work(competitionScope({ matches: writer })),
    } satisfies CompetitionTransaction,
    new CompetitionAfterCommit(
      { invalidateTournament: async () => {} },
      {
        publish: async (event) => {
          published.push(event);
        },
      },
      { error: () => {} },
    ),
  );

  const pickems = new PickemService(
    { list: async () => [] },
    new CompetitionPickemMatches(competition),
    {
      run: async (work) =>
        await work({
          participantExists: async () => true,
          pick: async () => null,
          savePick: async () => {},
          unscored: async () => [],
          userExists: async () => true,
        }),
    },
    { id: () => "id", now: () => new Date("2026-01-01T12:00:00Z"), warn: () => {} },
  );

  return { pickems, published, saved, stored };
};

describe("deciding a match from pick'ems", () => {
  it("is live while it runs", () => {
    expect(isMatchLive(arrange().stored, now)).toBe(true);
  });

  describe("once its result is validated", () => {
    let fixture: ReturnType<typeof arrange>;

    beforeEach(async () => {
      fixture = arrange();
      await fixture.pickems.validateMatchResult("m");
    });

    it("saves the decided match", () => {
      expect(fixture.saved).toStrictEqual([fixture.stored]);
    });

    it("stamps the winner and the end", () => {
      expect(fixture.stored.winner?.id).toBe("a");
      expect(fixture.stored.endAt).toBeInstanceOf(Date);
      expect(isMatchFinished(fixture.stored)).toBe(true);
    });

    it("leaves the live list", () => {
      expect(isMatchLive(fixture.stored, now)).toBe(false);
    });

    it("publishes MatchDecided", () => {
      expect(fixture.published).toStrictEqual([matchDecided("m")]);
    });
  });
});
