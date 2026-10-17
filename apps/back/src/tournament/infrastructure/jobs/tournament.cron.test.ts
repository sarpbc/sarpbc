import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { MikroORM } from "@mikro-orm/postgresql";
import { TournamentCron } from "./tournament.cron";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { MatchService } from "../../application/match/match.service";
import { TournamentService } from "../../application/tournament.service";

vi.mock("@mikro-orm/decorators/legacy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mikro-orm/decorators/legacy")>()),
  CreateRequestContext:
    () => (_target: TournamentCron, _key: string | symbol, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe("TournamentCron", () => {
  let cron: TournamentCron;
  const syncNewTournamentsUseCase = { execute: vi.fn() };
  const syncPandascoreTournamentUseCase = { execute: vi.fn() };
  const matchService = {
    findLive: vi.fn(),
    findRecentlyEnded: vi.fn(),
  };
  const tournamentService = { findPandascoreActiveIds: vi.fn() };

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
    vi.clearAllMocks();
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
