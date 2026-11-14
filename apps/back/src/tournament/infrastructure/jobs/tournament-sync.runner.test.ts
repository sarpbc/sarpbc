import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TournamentSyncRunner } from "./tournament-sync.runner";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { MatchService } from "../../application/match/match.service";
import { Match } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import type { TournamentQueries } from "../../application/ports";
import { TOURNAMENT_QUERIES } from "../competition-queries.tokens";

function matchIn(tournamentId: string): Match {
  return Object.assign(new Match(), {
    tournament: Object.assign(new Tournament(), { id: tournamentId }),
  });
}

describe(TournamentSyncRunner, () => {
  let cron: TournamentSyncRunner;

  const syncNewTournamentsUseCase = {
    execute: vi.fn<SyncNewTournamentsUseCase["execute"]>(),
  };

  const syncPandascoreTournamentUseCase = {
    execute: vi.fn<SyncPandascoreTournamentUseCase["execute"]>(),
  };

  const matchService = {
    list: vi.fn<MatchService["list"]>(),
    findRecentlyEnded: vi.fn<MatchService["findRecentlyEnded"]>(),
  };

  const tournaments = {
    findPandascoreActive: vi.fn<TournamentQueries["findPandascoreActive"]>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentSyncRunner,
        { provide: SyncNewTournamentsUseCase, useValue: syncNewTournamentsUseCase },
        { provide: SyncPandascoreTournamentUseCase, useValue: syncPandascoreTournamentUseCase },
        { provide: MatchService, useValue: matchService },
        { provide: TOURNAMENT_QUERIES, useValue: tournaments },
      ],
    }).compile();

    cron = module.get(TournamentSyncRunner);
    vi.clearAllMocks();
    matchService.list.mockResolvedValue([[], 0]);
    matchService.findRecentlyEnded.mockResolvedValue([]);
    tournaments.findPandascoreActive.mockResolvedValue([]);
  });

  it("syncActiveTournaments syncs tournaments with live matches", async () => {
    matchService.list.mockResolvedValue([[matchIn("tournament-1")], 1]);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledExactlyOnceWith("tournament-1");
  });

  it("syncActiveTournaments syncs active tournaments that have no match yet", async () => {
    tournaments.findPandascoreActive.mockResolvedValue([{ id: "empty-playoffs" }]);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledExactlyOnceWith(
      "empty-playoffs",
    );
  });

  it("syncActiveTournaments syncs each tournament once and continues after a failure", async () => {
    tournaments.findPandascoreActive.mockResolvedValue([
      { id: "tournament-1" },
      { id: "tournament-2" },
    ]);
    matchService.list.mockResolvedValue([[matchIn("tournament-1")], 1]);
    syncPandascoreTournamentUseCase.execute
      .mockRejectedValueOnce(new Error("PandaScore down"))
      .mockResolvedValueOnce(undefined);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledTimes(2);
    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("tournament-2");
  });
});
