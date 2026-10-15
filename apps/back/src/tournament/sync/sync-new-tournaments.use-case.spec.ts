import { Test, TestingModule } from "@nestjs/testing";
import { SyncNewTournamentsUseCase } from "./sync-new-tournaments.use-case";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";

describe("SyncNewTournamentsUseCase", () => {
  let useCase: SyncNewTournamentsUseCase;
  const syncAllTournamentsUseCase = { execute: jest.fn() };
  const syncPandascoreTournamentUseCase = { execute: jest.fn() };
  const syncPandascoreIncidentsUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncNewTournamentsUseCase,
        { provide: SyncAllTournamentsUseCase, useValue: syncAllTournamentsUseCase },
        { provide: SyncPandascoreTournamentUseCase, useValue: syncPandascoreTournamentUseCase },
        { provide: SyncPandascoreIncidentsUseCase, useValue: syncPandascoreIncidentsUseCase },
      ],
    }).compile();

    useCase = module.get(SyncNewTournamentsUseCase);
    jest.clearAllMocks();
  });

  it("discovers missing tournaments, syncs their details, then runs incidents", async () => {
    syncAllTournamentsUseCase.execute.mockResolvedValue(["t1", "t2"]);
    syncPandascoreTournamentUseCase.execute
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));
    syncPandascoreIncidentsUseCase.execute.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(syncAllTournamentsUseCase.execute).toHaveBeenCalled();
    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("t1");
    expect(syncPandascoreTournamentUseCase.execute).toHaveBeenCalledWith("t2");
    expect(syncPandascoreIncidentsUseCase.execute).toHaveBeenCalled();
    expect(result).toEqual({
      discovered: 2,
      detailsSynced: 1,
      detailsFailed: 1,
    });
  });
});
