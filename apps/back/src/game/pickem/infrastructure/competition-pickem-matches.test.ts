import { describe, expect, it, vi } from "vitest";
import { isMatchFinished, isMatchLive } from "@sarpbc/utils";
import {
  Match,
  TournamentParticipant,
  type TournamentSummary,
} from "../../../tournament/domain/competition";
import { matchDecided } from "../../../tournament/domain/match-decided";
import { CompetitionAfterCommit } from "../../../tournament/application/after-commit";
import { MatchService } from "../../../tournament/application/match/match.service";
import type { CompetitionTransaction } from "../../../tournament/application/ports";
import { competitionScope, matchQueries, matchWriter } from "../../../../test/competition-doubles";
import { PickemService } from "../application/pickem.service";
import { CompetitionPickemMatches } from "./competition-pickem-matches";

describe("deciding a match from pick'ems", () => {
  it("stamps the end and publishes MatchDecided so the match leaves the live list", async () => {
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

    const save = vi.fn(async () => {});
    const writer = matchWriter({ load: async () => stored, save });
    const publish = vi.fn(async () => {});

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

    const now = new Date("2026-01-01T12:00:00Z");
    expect(isMatchLive(stored, now)).toBe(true);

    await pickems.validateMatchResult("m");

    expect(save).toHaveBeenCalledWith(stored);
    expect(stored.winner?.id).toBe("a");
    expect(stored.endAt).toBeInstanceOf(Date);
    expect(isMatchFinished(stored)).toBe(true);
    expect(isMatchLive(stored, now)).toBe(false);
    expect(publish).toHaveBeenCalledWith(matchDecided("m"));
  });
});
