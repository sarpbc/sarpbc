import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
describe("SyncPandascoreTournamentUseCase", () => {
  const feed = {
    getTournamentById: vi.fn(),
    getTournamentBrackets: vi.fn(),
    getTournamentMatches: vi.fn(),
    getTournamentStandings: vi.fn(),
  };
  const reads = { findById: vi.fn() };
  const sync = { upsertTournament: vi.fn() };
  const useCase = new SyncPandascoreTournamentUseCase(feed as never, reads, sync as never);
  beforeEach(() => {
    vi.clearAllMocks();
    reads.findById.mockResolvedValue({
      id: "t1",
      source: "pandascore",
      pandascoreId: 42,
      hasBracket: false,
    });
    sync.upsertTournament.mockResolvedValue({ id: "t1" });
    feed.getTournamentMatches.mockResolvedValue([]);
    feed.getTournamentBrackets.mockResolvedValue([]);
    feed.getTournamentStandings.mockResolvedValue([{ teamPandascoreId: 8, rank: 1 }]);
  });
  it.each([true, false])("uses fresh provider hasBracket=%s", async (hasBracket) => {
    const command = { pandascoreId: 42, name: "Playoffs", hasBracket };
    feed.getTournamentById.mockResolvedValue(command);
    await useCase.execute("t1");
    expect(
      hasBracket ? feed.getTournamentBrackets : feed.getTournamentMatches,
    ).toHaveBeenCalledWith(42);
    expect(
      hasBracket ? feed.getTournamentMatches : feed.getTournamentBrackets,
    ).not.toHaveBeenCalled();
    expect(feed.getTournamentStandings).toHaveBeenCalledWith(42);
    expect(sync.upsertTournament).toHaveBeenCalledWith(
      { ...command, standings: [{ teamPandascoreId: 8, rank: 1 }] },
      [],
      undefined,
    );
  });
  it("protects manual tournaments before fetching", async () => {
    reads.findById.mockResolvedValue({ id: "manual", source: "manual" });
    await expect(useCase.execute("manual")).rejects.toThrow(
      "Cannot sync a manual tournament from PandaScore",
    );
    expect(feed.getTournamentById).not.toHaveBeenCalled();
  });
  it("reports a transient provider failure instead of a missing tournament", async () => {
    feed.getTournamentById.mockRejectedValue(new Error("429 Too Many Requests"));
    await expect(useCase.executeByPandascoreId(42)).rejects.toThrow("429");
    await expect(useCase.execute("t1")).rejects.toThrow("429");
    expect(sync.upsertTournament).not.toHaveBeenCalled();
  });
  it("fetches all provider data before opening the write operation", async () => {
    feed.getTournamentById.mockResolvedValue({ pandascoreId: 42, name: "Cup" });
    feed.getTournamentMatches.mockRejectedValue(new Error("provider failed"));
    await expect(useCase.executeByPandascoreId(42)).rejects.toThrow("provider failed");
    expect(sync.upsertTournament).not.toHaveBeenCalled();
  });
});
