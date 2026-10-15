import { Test, TestingModule } from "@nestjs/testing";
import { PANDASCORE_GATEWAY } from "src/pandascore/application/ports/pandascore.gateway.port";
import { SYNC_CURSOR_REPOSITORY } from "src/pandascore/domain/sync-cursor.repository.interface";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

const playerObject = (currentTeam: { id: number; name: string; slug: string } | null) => ({
  id: 68367,
  name: "Sythoka",
  slug: "sythoka",
  first_name: "",
  last_name: null,
  nationality: "SE",
  image_url: null,
  role: null,
  current_team: currentTeam,
});

describe("SyncPandascoreIncidentsUseCase", () => {
  let useCase: SyncPandascoreIncidentsUseCase;
  const pandascoreGateway = {
    listIncidents: jest.fn(),
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
    flush: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncPandascoreIncidentsUseCase,
        { provide: PANDASCORE_GATEWAY, useValue: pandascoreGateway },
        { provide: SYNC_CURSOR_REPOSITORY, useValue: syncCursorRepository },
        { provide: TournamentSyncPersistence, useValue: persistence },
      ],
    }).compile();

    useCase = module.get(SyncPandascoreIncidentsUseCase);
    jest.clearAllMocks();
    syncCursorRepository.getLastSyncAt.mockResolvedValue(new Date("2025-01-01T00:00:00Z"));
  });

  it("updates cursor even when no incidents are returned", async () => {
    syncCursorRepository.getLastSyncAt.mockResolvedValue(null);
    pandascoreGateway.listIncidents.mockResolvedValue([]);

    await useCase.execute();

    expect(syncCursorRepository.setLastSyncAt).toHaveBeenCalledWith(expect.any(Date));
    expect(persistence.upsertTournament).not.toHaveBeenCalled();
  });

  it("routes tournament incidents to persistence", async () => {
    pandascoreGateway.listIncidents.mockResolvedValue([
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

  it("applies update incidents, not only creations", async () => {
    pandascoreGateway.listIncidents.mockResolvedValue([
      {
        id: 7,
        change_type: "update",
        modified_at: "2025-01-02T00:00:00Z",
        type: "team",
        object: {
          id: 7,
          name: "Team Secret",
          slug: "team-secret-rl",
          location: "BR",
          image_url: "https://cdn/secret.png",
          dark_mode_image_url: null,
        },
      },
    ]);

    await useCase.execute();

    expect(persistence.upsertTeam).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 7, name: "Team Secret", slug: "team-secret-rl" }),
    );
  });

  it("attaches a player to their current team", async () => {
    const team = { id: "local-team" };
    persistence.upsertTeam.mockResolvedValue(team);
    pandascoreGateway.listIncidents.mockResolvedValue([
      {
        id: 68367,
        change_type: "creation",
        modified_at: "2025-01-02T00:00:00Z",
        type: "player",
        object: playerObject({ id: 136000, name: "Lilmix", slug: "lilmix-rl" }),
      },
    ]);

    await useCase.execute();

    expect(persistence.upsertTeam).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 136000, slug: "lilmix-rl" }),
    );
    expect(persistence.upsertPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 68367, slug: "sythoka" }),
      team,
    );
  });

  it("detaches a player who no longer has a team", async () => {
    pandascoreGateway.listIncidents.mockResolvedValue([
      {
        id: 68367,
        change_type: "update",
        modified_at: "2025-01-02T00:00:00Z",
        type: "player",
        object: playerObject(null),
      },
    ]);

    await useCase.execute();

    expect(persistence.upsertTeam).not.toHaveBeenCalled();
    expect(persistence.upsertPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ pandascoreId: 68367 }),
      null,
    );
  });

  it("flushes after every incident so the last one of a run is persisted", async () => {
    pandascoreGateway.listIncidents.mockResolvedValue([
      {
        id: 1,
        change_type: "creation",
        modified_at: "2025-01-02T00:00:00Z",
        type: "player",
        object: playerObject(null),
      },
      {
        id: 2,
        change_type: "creation",
        modified_at: "2025-01-02T00:01:00Z",
        type: "player",
        object: playerObject(null),
      },
    ]);

    await useCase.execute();

    expect(persistence.flush).toHaveBeenCalledTimes(2);
    expect(persistence.flush.mock.invocationCallOrder[1]).toBeGreaterThan(
      persistence.upsertPlayer.mock.invocationCallOrder[1],
    );
  });

  it("skips deletion incidents but still advances the cursor", async () => {
    pandascoreGateway.listIncidents.mockResolvedValue([
      {
        id: 68228,
        change_type: "deletion",
        modified_at: "2025-01-04T00:00:00Z",
        type: "player",
        object: { reason: "Model deleted", deleted_at: "2025-01-04T00:00:00Z" },
      },
    ]);

    await useCase.execute();

    expect(persistence.upsertPlayer).not.toHaveBeenCalled();
    expect(syncCursorRepository.setLastSyncAt).toHaveBeenCalledWith(
      new Date("2025-01-04T00:00:00Z"),
    );
  });

  it("backfills a missing tournament when processing a match incident", async () => {
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
    pandascoreGateway.listIncidents.mockResolvedValue([
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
