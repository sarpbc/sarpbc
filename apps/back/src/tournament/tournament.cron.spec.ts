import { Test, TestingModule } from "@nestjs/testing";
import { MikroORM } from "@mikro-orm/postgresql";
import { TournamentCron } from "./tournament.cron";
import { SyncNewTournamentsUseCase } from "./sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { MatchService } from "./match/match.service";
import { TournamentService } from "./tournament.service";

describe("TournamentCron", () => {
  let cron: TournamentCron;
  const syncNewTournamentsUseCase = { execute: jest.fn() };
  const syncPandascoreTournamentUseCase = { execute: jest.fn() };
  const matchService = {
    findLive: jest.fn(),
    findRecentlyEnded: jest.fn(),
  };
  const tournamentService = { findPandascoreActiveIds: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentCron,
        { provide: MikroORM, useValue: {} },
        { provide: SyncNewTournamentsUseCase, useValue: syncNewTournamentsUseCase },
        { provide: SyncPandascoreTournamentUseCase, useValue: syncPandascoreTournamentUseCase },
        { provide: MatchService, useValue: matchService },
        { provide: TournamentService, useValue: tournamentService },
      ],
    }).compile();

    cron = module.get(TournamentCron);
    jest.clearAllMocks();
    matchService.findLive.mockResolvedValue([]);
    matchService.findRecentlyEnded.mockResolvedValue([]);
    tournamentService.findPandascoreActiveIds.mockResolvedValue([]);
  });

  it("syncPandascoreAdditionsDaily delegates to new-tournaments use case", async () => {
    syncNewTournamentsUseCase.execute.mockResolvedValue({
      discovered: 0,
      detailsSynced: 0,
      detailsFailed: 0,
    });

    await cron.syncPandascoreAdditionsDaily();
    expect(syncNewTournamentsUseCase.execute).toHaveBeenCalled();
  });

  it("syncActiveTournaments syncs tournaments with live matches", async () => {
    matchService.findLive.mockResolvedValue([{ tournament: { id: "tournament-1" } }]);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("tournament-1");
  });

  it("syncActiveTournaments syncs active tournaments that have no match yet", async () => {
    tournamentService.findPandascoreActiveIds.mockResolvedValue(["empty-playoffs"]);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("empty-playoffs");
  });

  it("syncActiveTournaments syncs each tournament once and continues after a failure", async () => {
    tournamentService.findPandascoreActiveIds.mockResolvedValue(["tournament-1", "tournament-2"]);
    matchService.findLive.mockResolvedValue([{ tournament: { id: "tournament-1" } }]);
    syncPandascoreTournamentUseCase.execute
      .mockRejectedValueOnce(new Error("PandaScore down"))
      .mockResolvedValueOnce(undefined);

    await cron.syncActiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledTimes(2);
    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("tournament-2");
  });
});
