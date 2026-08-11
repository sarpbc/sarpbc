import { Test, TestingModule } from "@nestjs/testing";
import { MikroORM } from "@mikro-orm/postgresql";
import { TournamentCron } from "./tournament.cron";
import { SyncNewTournamentsUseCase } from "./sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { MatchService } from "./match/match.service";

describe("TournamentCron", () => {
  let cron: TournamentCron;
  const syncNewTournamentsUseCase = { execute: jest.fn() };
  const syncPandascoreTournamentUseCase = { execute: jest.fn() };
  const matchService = {
    findLive: jest.fn(),
    findRecentlyEnded: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentCron,
        { provide: MikroORM, useValue: {} },
        { provide: SyncNewTournamentsUseCase, useValue: syncNewTournamentsUseCase },
        { provide: SyncPandascoreTournamentUseCase, useValue: syncPandascoreTournamentUseCase },
        { provide: MatchService, useValue: matchService },
      ],
    }).compile();

    cron = module.get(TournamentCron);
    jest.clearAllMocks();
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

  it("syncLiveTournaments syncs tournaments with live matches", async () => {
    matchService.findLive.mockResolvedValue([{ tournament: { id: "tournament-1" } }]);
    matchService.findRecentlyEnded.mockResolvedValue([]);

    await cron.syncLiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("tournament-1");
  });
});
