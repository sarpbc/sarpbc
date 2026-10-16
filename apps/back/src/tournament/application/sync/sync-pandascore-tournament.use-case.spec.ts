import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
describe("SyncPandascoreTournamentUseCase", () => {
  const feed = {
    getTournamentById: jest.fn(),
    getTournamentBrackets: jest.fn(),
    getTournamentMatches: jest.fn(),
  };
  const sync = { findTournamentById: jest.fn(), upsertTournament: jest.fn() };
  const useCase = new SyncPandascoreTournamentUseCase(feed as never, sync as never);
  beforeEach(() => {
    jest.clearAllMocks();
    sync.findTournamentById.mockResolvedValue({
      id: "t1",
      source: "pandascore",
      pandascoreId: 42,
      hasBracket: false,
    });
    sync.upsertTournament.mockResolvedValue({ id: "t1" });
    feed.getTournamentMatches.mockResolvedValue([]);
    feed.getTournamentBrackets.mockResolvedValue([]);
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
    expect(sync.upsertTournament).toHaveBeenCalledWith(command, []);
  });
  it("protects manual tournaments before fetching", async () => {
    sync.findTournamentById.mockResolvedValue({ id: "manual", source: "manual" });
    await expect(useCase.execute("manual")).rejects.toThrow(
      "Cannot sync a manual tournament from PandaScore",
    );
    expect(feed.getTournamentById).not.toHaveBeenCalled();
  });
  it("fetches all provider data before opening the write operation", async () => {
    feed.getTournamentById.mockResolvedValue({ pandascoreId: 42, name: "Cup" });
    feed.getTournamentMatches.mockRejectedValue(new Error("provider failed"));
    await expect(useCase.executeByPandascoreId(42)).rejects.toThrow("provider failed");
    expect(sync.upsertTournament).not.toHaveBeenCalled();
  });
});
