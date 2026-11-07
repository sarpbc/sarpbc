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
      tournament: { id: "cup", pickemsEnabled: true } as TournamentSummary,
    });
    const writer = { load: vi.fn(async () => stored), save: vi.fn(async () => {}) };
    const events = { publish: vi.fn(async () => {}) };
    const competition = new MatchService(
      { detail: async () => stored } as never,
      { run: (work: (scope: never) => unknown) => work({ matches: writer } as never) } as never,
      new CompetitionAfterCommit({ invalidateTournament: vi.fn() }, events, {
        error: vi.fn(),
      }),
    );
    const pickems = new PickemService(
      { list: async () => [] },
      new CompetitionPickemMatches(competition),
      { run: async (work) => work({ unscored: async () => [] } as never) },
      { now: () => new Date("2026-01-01T12:00:00Z"), id: () => "id", warn: vi.fn() },
    );
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isMatchLive(stored, now)).toBe(true);

    await pickems.validateMatchResult("m");

    expect(writer.save).toHaveBeenCalledWith(stored);
    expect(stored.winner?.id).toBe("a");
    expect(stored.endAt).toBeInstanceOf(Date);
    expect(isMatchFinished(stored)).toBe(true);
    expect(isMatchLive(stored, now)).toBe(false);
    expect(events.publish).toHaveBeenCalledWith(matchDecided("m"));
  });
});
