import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMatchFinished, isMatchLive } from "@sarpbc/utils";
import { Match, type TournamentSummary } from "../../../tournament/domain/match";
import { TournamentParticipant } from "../../../tournament/domain/tournament-participant";
import { matchDecided } from "../../../tournament/domain/match-decided";
import { CompetitionAfterCommit } from "../../../tournament/application/after-commit";
import { MatchService } from "../../../tournament/application/match/match.service";
import type {
  CompetitionEvents,
  CompetitionTransaction,
  MatchWriter,
} from "../../../tournament/application/ports";
import { competitionScope, matchQueries, matchWriter } from "../../../../test/competition-doubles";
import { PickemService } from "../application/pickem.service";
import { CompetitionPickemMatches } from "./competition-pickem-matches";

const now = new Date("2026-01-01T12:00:00Z");

function arrange() {
  const [a, b] = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));

  const stored = Object.assign(new Match(), {
    id: "m",
    beginAt: new Date("2026-01-01T10:00:00Z"),
    status: "running",
    participants: [a, b],
    results: [
      { id: "r1", match: { id: "m" }, participant: { id: "a" }, score: 3 },
      { id: "r2", match: { id: "m" }, participant: { id: "b" }, score: 1 },
    ],
    tournament: {
      id: "cup",
      name: "Cup",
      slug: "cup",
      event: { id: "event", slug: "event", name: "Event" },
      beginAt: null,
      league: null,
      pickemsEnabled: true,
      source: "manual",
      pandascoreId: null,
      streams: [],
      eventStreams: [],
    } satisfies TournamentSummary,
  });

  const save = vi.fn<MatchWriter["save"]>(async () => {});
  const writer = matchWriter({ load: async () => stored, save });
  const publish = vi.fn<CompetitionEvents["publish"]>(async () => {});

  const competition = new MatchService(
    matchQueries({ detail: async () => stored }),
    {
      run: async (work) => await work(competitionScope({ matches: writer })),
    } satisfies CompetitionTransaction,
    new CompetitionAfterCommit(
      { invalidateTournament: async () => {} },
      { publish },
      { error: () => {} },
    ),
  );

  const pickems = new PickemService(
    { list: async () => [] },
    new CompetitionPickemMatches(competition),
    {
      run: async (work) =>
        await work({
          userExists: async () => true,
          participantExists: async () => true,
          pick: async () => null,
          unscored: async () => [],
          savePick: async () => {},
        }),
    },
    { now: () => new Date("2026-01-01T12:00:00Z"), id: () => "id", warn: () => {} },
  );

  return { stored, save, publish, pickems };
}

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
      expect(fixture.save).toHaveBeenCalledExactlyOnceWith(fixture.stored);
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
      expect(fixture.publish).toHaveBeenCalledExactlyOnceWith(matchDecided("m"));
    });
  });
});
