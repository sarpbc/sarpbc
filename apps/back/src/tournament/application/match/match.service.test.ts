import { beforeEach, describe, expect, it, vi } from "vitest";
import { Match, TournamentParticipant } from "../../domain/competition";
import { matchDecided } from "../../domain/match-decided";
import { MatchService } from "./match.service";

describe("MatchService decided events", () => {
  const participants = ["a", "b"].map((id) => Object.assign(new TournamentParticipant(), { id }));
  const stored = Object.assign(new Match(), { id: "match", participants });
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
  const service = new MatchService(
    reads as never,
    { run: (work: (scope: never) => unknown) => work({ matches } as never) } as never,
    events,
    diagnostics,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    matches.load.mockResolvedValue(stored);
    matches.tournament.mockResolvedValue({ id: "cup" });
    matches.participants.mockResolvedValue(participants);
    matches.byPandascoreId.mockResolvedValue(null);
  });

  it("publishes MatchDecided once a winner is set", async () => {
    reads.detail.mockResolvedValue(
      Object.assign(new Match(), { id: "match", status: "finished", winner: participants[0] }),
    );
    await service.setMatchWinner("match", "a");
    expect(events.publish).toHaveBeenCalledWith(matchDecided("match"));
  });

  it("stays silent for an undecided match", async () => {
    reads.detail.mockResolvedValue(Object.assign(new Match(), { id: "match", status: "running" }));
    await service.upsertMatch("cup", { name: "Final", participantIds: ["a", "b"] });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("returns the match when publication fails", async () => {
    reads.detail.mockResolvedValue(
      Object.assign(new Match(), { id: "match", status: "finished", winner: participants[0] }),
    );
    events.publish.mockRejectedValue(new Error("listener"));
    await expect(service.setMatchWinner("match", "a")).resolves.toMatchObject({ id: "match" });
    expect(diagnostics.error).toHaveBeenCalledWith(
      "MatchDecided publication failed",
      expect.any(Error),
    );
  });
});
