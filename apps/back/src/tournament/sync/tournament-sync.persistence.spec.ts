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

  it("does not overwrite manual tournaments during PandaScore upsert", async () => {
    const manualTournament = {
      id: "manual-1",
      source: "manual",
      name: "Community Cup",
      pandascoreId: 99,
    } as Tournament;
    tournamentRepository.findOne.mockResolvedValue(manualTournament);

    const result = await persistence.upsertTournament({
      pandascoreId: 99,
      name: "Updated From PandaScore",
    });

    expect(result).toBe(manualTournament);
    expect(result.name).toBe("Community Cup");
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
});
