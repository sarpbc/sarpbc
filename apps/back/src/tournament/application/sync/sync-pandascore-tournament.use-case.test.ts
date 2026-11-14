import { beforeEach, describe, expect, it, vi } from "vitest";
import { competitionFeed } from "../../../../test/competition-doubles";
import { unconstructed } from "../../../../test/doubles";
import { Tournament } from "../../domain/tournament";
import type { CompetitionFeed, UpsertTournamentCommand } from "../feed";
import type { TournamentQueries } from "../ports";
import { CompetitionSyncService } from "./competition-sync.service";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

describe(SyncPandascoreTournamentUseCase, () => {
  const feed = {
    getTournamentById: vi.fn<CompetitionFeed["getTournamentById"]>(),
    getTournamentBrackets: vi.fn<CompetitionFeed["getTournamentBrackets"]>(),
    getTournamentMatches: vi.fn<CompetitionFeed["getTournamentMatches"]>(),
    getTournamentStandings: vi.fn<CompetitionFeed["getTournamentStandings"]>(),
  };

  const reads = { findById: vi.fn<TournamentQueries["findById"]>() };
  const sync = { upsertTournament: vi.fn<CompetitionSyncService["upsertTournament"]>() };

  const useCase = new SyncPandascoreTournamentUseCase(
    competitionFeed(feed),
    reads,
    Object.assign(unconstructed(CompetitionSyncService), sync),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    reads.findById.mockResolvedValue(
      Object.assign(new Tournament(), {
        id: "t1",
        source: "pandascore",
        pandascoreId: 42,
        hasBracket: false,
      }),
    );
    sync.upsertTournament.mockResolvedValue(Object.assign(new Tournament(), { id: "t1" }));
    feed.getTournamentMatches.mockResolvedValue([]);
    feed.getTournamentBrackets.mockResolvedValue([]);
    feed.getTournamentStandings.mockResolvedValue([{ teamPandascoreId: 8, rank: 1 }]);
  });

  it.each([true, false])("uses fresh provider hasBracket=%s", async (hasBracket) => {
    const command: UpsertTournamentCommand = { pandascoreId: 42, name: "Playoffs", hasBracket };
    feed.getTournamentById.mockResolvedValue(command);
    await useCase.execute("t1");
    expect(
      hasBracket ? feed.getTournamentBrackets : feed.getTournamentMatches,
    ).toHaveBeenCalledExactlyOnceWith(42);
    expect(
      hasBracket ? feed.getTournamentMatches : feed.getTournamentBrackets,
    ).not.toHaveBeenCalled();
    expect(feed.getTournamentStandings).toHaveBeenCalledExactlyOnceWith(42);
    expect(sync.upsertTournament).toHaveBeenCalledExactlyOnceWith(
      { ...command, standings: [{ teamPandascoreId: 8, rank: 1 }] },
      [],
      undefined,
    );
  });

  it("leaves placements untouched when standings are unavailable", async () => {
    const command: UpsertTournamentCommand = { pandascoreId: 42, name: "Playoffs" };
    feed.getTournamentById.mockResolvedValue(command);
    feed.getTournamentStandings.mockResolvedValue(null);
    await useCase.execute("t1");
    expect(sync.upsertTournament).toHaveBeenCalledExactlyOnceWith(command, [], undefined);
  });

  it("protects manual tournaments before fetching", async () => {
    reads.findById.mockResolvedValue(
      Object.assign(new Tournament(), { id: "manual", source: "manual" }),
    );
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
