import { Player, Team } from "src/player/player.entities";
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
  it("keeps an edited slug when the PandaScore id already matches a player", async () => {
    const player = Object.assign(new Player(), { slug: "zen", pandascoreId: 29079, name: "zen" });
    em.findOne.mockResolvedValueOnce(player);

    const synced = await persistence.upsertPlayer({
      pandascoreId: 29079,
      name: "zen",
      slug: "zen-aidan-hui",
      firstName: "Alexis",
    });

    expect(synced).toBe(player);
    expect(synced.slug).toBe("zen");
    expect(synced.firstName).toBe("Alexis");
  });

  it("adopts a player stored by slug before PandaScore ids were recorded", async () => {
    const player = Object.assign(new Player(), { slug: "zen-aidan-hui", pandascoreId: null });
    em.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(player);

    const synced = await persistence.upsertPlayer({
      pandascoreId: 29079,
      name: "zen",
      slug: "zen-aidan-hui",
    });

    expect(synced).toBe(player);
    expect(synced.pandascoreId).toBe(29079);
    expect(em.findOne).toHaveBeenNthCalledWith(2, Player, {
      slug: "zen-aidan-hui",
      pandascoreId: null,
    });
  });

  it("suffixes the slug of a new player when another player already holds it", async () => {
    em.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(Object.assign(new Player(), { slug: "zen", pandascoreId: 1 }));

    const created = await persistence.upsertPlayer({ pandascoreId: 2, name: "zen", slug: "zen" });

    expect(created.slug).toBe("zen-2");
    expect(created.pandascoreId).toBe(2);
  });

  it("moves a player to the given team and detaches them when the team is null", async () => {
    const oldTeam = Object.assign(new Team(), { slug: "bigodes-rl" });
    const newTeam = Object.assign(new Team(), { slug: "team-secret-rl" });
    const player = Object.assign(new Player(), {
      slug: "drufinho",
      pandascoreId: 1,
      team: oldTeam,
    });
    em.findOne.mockResolvedValue(player);

    await persistence.upsertPlayer(
      { pandascoreId: 1, name: "Drufinho", slug: "drufinho" },
      newTeam,
    );
    expect(player.team).toBe(newTeam);

    await persistence.upsertPlayer({ pandascoreId: 1, name: "Drufinho", slug: "drufinho" }, null);
    expect(player.team).toBeNull();
  });

  it("keeps the player's team when no team is given", async () => {
    const team = Object.assign(new Team(), { slug: "bigodes-rl" });
    const player = Object.assign(new Player(), { slug: "drufinho", pandascoreId: 1, team });
    em.findOne.mockResolvedValue(player);

    await persistence.upsertPlayer({ pandascoreId: 1, name: "Drufinho", slug: "drufinho" });

    expect(player.team).toBe(team);
  });
});
