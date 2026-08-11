import { Test, TestingModule } from "@nestjs/testing";
import { PANDASCORE_GATEWAY } from "src/pandascore/application/ports/pandascore.gateway.port";
import { SYNC_CURSOR_REPOSITORY } from "src/pandascore/domain/sync-cursor.repository.interface";
import { SyncPandascoreAdditionsUseCase } from "./sync-pandascore-additions.use-case";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

describe("SyncPandascoreAdditionsUseCase", () => {
  let useCase: SyncPandascoreAdditionsUseCase;
  const pandascoreGateway = {
    listAdditions: jest.fn(),
    getTournamentById: jest.fn(),
  };
  const syncCursorRepository = {
    getLastSyncAt: jest.fn(),
    setLastSyncAt: jest.fn(),
  };
  const persistence = {
    upsertTournament: jest.fn(),
    upsertTeam: jest.fn(),
    upsertPlayer: jest.fn(),
    upsertLeague: jest.fn(),
    upsertMatchesForTournament: jest.fn(),
    findTournamentByPandascoreId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncPandascoreAdditionsUseCase,
        { provide: PANDASCORE_GATEWAY, useValue: pandascoreGateway },
        { provide: SYNC_CURSOR_REPOSITORY, useValue: syncCursorRepository },
        { provide: TournamentSyncPersistence, useValue: persistence },
      ],
    }).compile();

    useCase = module.get(SyncPandascoreAdditionsUseCase);
    jest.clearAllMocks();
  });

  it("updates cursor even when no additions are returned", async () => {
    syncCursorRepository.getLastSyncAt.mockResolvedValue(null);
    pandascoreGateway.listAdditions.mockResolvedValue([]);

    await useCase.execute();

    expect(syncCursorRepository.setLastSyncAt).toHaveBeenCalledWith(expect.any(Date));
    expect(persistence.upsertTournament).not.toHaveBeenCalled();
  });

  it("routes tournament additions to persistence", async () => {
    syncCursorRepository.getLastSyncAt.mockResolvedValue(new Date("2025-01-01T00:00:00Z"));
    pandascoreGateway.listAdditions.mockResolvedValue([
      {
        id: 1,
        change_type: "creation",
        modified_at: "2025-01-02T00:00:00Z",
        type: "tournament",
        object: {
          id: 42,
          name: "RLCS",
          slug: "rlcs",
          type: "online",
          begin_at: null,
          end_at: null,
          winner_id: null,
          winner_type: "Team",
          expected_roster: [],
        },
      },
    ]);

    await useCase.execute();

    expect(persistence.upsertTournament).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 42, name: "RLCS" }),
    );
    expect(syncCursorRepository.setLastSyncAt).toHaveBeenCalledWith(
      new Date("2025-01-02T00:00:00Z"),
    );
  });

  it("backfills a missing tournament when processing a match addition", async () => {
    syncCursorRepository.getLastSyncAt.mockResolvedValue(new Date("2025-01-01T00:00:00Z"));
    persistence.findTournamentByPandascoreId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "local-tournament" });
    pandascoreGateway.getTournamentById.mockResolvedValue({
      id: 99,
      name: "Group A",
      slug: "group-a",
      type: "offline",
      begin_at: null,
      end_at: null,
      winner_id: null,
      winner_type: "Team",
      expected_roster: [],
    });
    pandascoreGateway.listAdditions.mockResolvedValue([
      {
        id: 2,
        change_type: "creation",
        modified_at: "2025-01-03T00:00:00Z",
        type: "match",
        object: {
          id: 1000,
          name: "Final",
          slug: "final",
          status: "not_started",
          begin_at: null,
          end_at: null,
          scheduled_at: null,
          number_of_games: 5,
          tournament_id: 99,
          opponents: [],
          results: [],
          previous_matches: [],
          winner_id: null,
        },
      },
    ]);

    await useCase.execute();

    expect(pandascoreGateway.getTournamentById).toHaveBeenCalledWith(99);
    expect(persistence.upsertTournament).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 99, name: "Group A" }),
    );
    expect(persistence.upsertMatchesForTournament).toHaveBeenCalledWith(
      { id: "local-tournament" },
      [expect.objectContaining({ pandascoreId: 1000 })],
    );
  });
});
