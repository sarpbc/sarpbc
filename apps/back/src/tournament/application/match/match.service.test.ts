import { beforeEach, describe, expect, it, vi } from "vitest";
import { Match, TournamentParticipant } from "../../domain/competition";
import { matchDecided } from "../../domain/match-decided";
import { CompetitionAfterCommit } from "../after-commit";
import { MatchService } from "./match.service";
import type { CompetitionTransaction } from "../ports";
import { competitionScope, matchQueries, matchWriter } from "../../../../test/competition-doubles";

describe("MatchService decided events", () => {
  const participants = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));
  let persisted: Match;

  const matches = {
    load: vi.fn(),
    byPandascoreId: vi.fn(),
    save: vi.fn(),
    tournament: vi.fn(),
    participants: vi.fn(),
  };

  const reads = { detail: vi.fn() };
  const events = { publish: vi.fn() };
  const diagnostics = { error: vi.fn(), warn: vi.fn() };
  const cache = { invalidateTournament: vi.fn() };

  const service = new MatchService(
    matchQueries(reads),
    {
      run: async (work) => await work(competitionScope({ matches: matchWriter(matches) })),
    } satisfies CompetitionTransaction,
    new CompetitionAfterCommit(cache, events, diagnostics),
  );

  const storedMatch = (fields: Partial<Match> = {}) =>
    Object.assign(new Match(), {
      id: "match",
      participants,
      tournament: { id: "cup" },
      ...fields,
    });

  beforeEach(() => {
    vi.resetAllMocks();
    persisted = storedMatch();
    matches.load.mockImplementation(async () => persisted);
    matches.save.mockImplementation(async (match: Match) => {
      persisted = match;
    });
    reads.detail.mockImplementation(async () => persisted);
    matches.tournament.mockResolvedValue({ id: "cup" });
    matches.participants.mockResolvedValue(participants);
    matches.byPandascoreId.mockResolvedValue(null);
  });

  it("publishes MatchDecided once a winner is set", async () => {
    await service.setMatchWinner("match", "a");

    expect(events.publish).toHaveBeenCalledExactlyOnceWith(matchDecided("match"));
  });

  it("stays silent for an undecided match", async () => {
    await service.createMatch("cup", { name: "Final", participantIds: ["a", "b"] });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("does not re-score a decided match when only its VODs change", async () => {
    persisted = storedMatch({ status: "finished", winner: participants[0] });

    await service.setVods("match", [{ game: 1, url: "https://youtu.be/a", language: "en" }]);
    await service.setGameVods("match", 2, []);

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("refreshes the cached tournament without re-scoring when only the source changes", async () => {
    persisted = storedMatch({ status: "finished", winner: participants[0] });

    await service.setSource("match", "https://www.rocketleague.com/en/news/rlcs-official-rules");

    expect(cache.invalidateTournament).toHaveBeenCalledWith("cup");
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("returns the match when publication fails", async () => {
    events.publish.mockRejectedValue(new Error("listener"));

    await expect(service.setMatchWinner("match", "a")).resolves.toMatchObject({ id: "match" });
    expect(diagnostics.error).toHaveBeenCalledWith(
      "MatchDecided publication failed",
      expect.any(Error),
    );
  });
});
