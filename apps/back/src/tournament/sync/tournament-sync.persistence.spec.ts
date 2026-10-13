import { Tournament } from "../tournament.entities";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

describe("TournamentSyncPersistence", () => {
  let persistence: TournamentSyncPersistence;
  const tournamentRepository = {
    findOne: jest.fn(),
  };
  const participantRepository = {
    find: jest.fn(),
  };
  const leagueService = {
    upsertLeague: jest.fn(),
  };
  const matchService = {
    upsertMatch: jest.fn(),
  };
  const em = {
    persist: jest.fn(),
    flush: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    persistence = new TournamentSyncPersistence(
      tournamentRepository as never,
      participantRepository as never,
      leagueService as never,
      matchService as never,
      em as never,
    );
    jest.clearAllMocks();
  });

  it("rejects upsert when an existing row is source=manual", async () => {
    const manualTournament = {
      id: "manual-1",
      source: "manual",
      name: "Community Cup",
      pandascoreId: 99,
    } as Tournament;
    tournamentRepository.findOne.mockResolvedValue(manualTournament);

    await expect(
      persistence.upsertTournament({
        pandascoreId: 99,
        name: "Updated From PandaScore",
      }),
    ).rejects.toThrow(/source=manual/);

    expect(em.persist).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it("marks PandaScore tournaments with source pandascore on create", async () => {
    tournamentRepository.findOne.mockResolvedValue(null);
    em.flush.mockResolvedValue(undefined);

    await persistence.upsertTournament({
      pandascoreId: 42,
      name: "RLCS",
    });

    expect(em.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        pandascoreId: 42,
        source: "pandascore",
        name: "RLCS",
      }),
    );
  });

  it("keeps locally managed artwork when PandaScore updates tournament details", async () => {
    const tournament = Object.assign(new Tournament(), {
      source: "pandascore",
      pandascoreId: 42,
      name: "Old name",
      imageUrl: "https://cdn.example/ewc.png",
    });
    tournamentRepository.findOne.mockResolvedValue(tournament);

    const synced = await persistence.upsertTournament({ pandascoreId: 42, name: "Group A" });

    expect(synced.name).toBe("Group A");
    expect(synced.imageUrl).toBe("https://cdn.example/ewc.png");
  });
});
