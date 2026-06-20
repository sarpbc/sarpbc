import { Test, TestingModule } from "@nestjs/testing";
import { MikroORM } from "@mikro-orm/postgresql";
import { TournamentCron } from "./tournament.cron";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { MatchService } from "./match/match.service";

describe("TournamentCron", () => {
  let cron: TournamentCron;
  const syncPandascoreAdditionsUseCase = { execute: jest.fn() };
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
        { provide: SyncPandascoreAdditionsUseCase, useValue: syncPandascoreAdditionsUseCase },
        { provide: SyncPandascoreTournamentUseCase, useValue: syncPandascoreTournamentUseCase },
        { provide: MatchService, useValue: matchService },
      ],
    }).compile();

    cron = module.get(TournamentCron);
    jest.clearAllMocks();
  });

  it("syncPandascoreAdditionsDaily delegates to additions use case", async () => {
    await cron.syncPandascoreAdditionsDaily();
    expect(syncPandascoreAdditionsUseCase.execute).toHaveBeenCalled();
  });

  it("syncLiveTournaments syncs tournaments with live matches", async () => {
    matchService.findLive.mockResolvedValue([{ tournament: { id: "tournament-1" } }]);
    matchService.findRecentlyEnded.mockResolvedValue([]);

    await cron.syncLiveTournaments();

    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("tournament-1");
  });
});
