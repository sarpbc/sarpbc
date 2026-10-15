import { Player, Team } from "src/player/player.entities";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";

type EntityClass = typeof Team | typeof Player;

describe("SyncPandascoreTeamsUseCase", () => {
  const em = {
    find: jest.fn(),
    findOne: jest.fn(),
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const pandascoreGateway = {
    getRocketLeaguePlayers: jest.fn(),
  };
  let useCase: SyncPandascoreTeamsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SyncPandascoreTeamsUseCase(
      { fork: () => em } as never,
      pandascoreGateway as never,
    );
    em.find.mockResolvedValue([]);
  });

  function givenStoredPlayer(player: Player): void {
    em.findOne.mockImplementation((entity: EntityClass, where: { pandascoreId?: number }) => {
      if (entity === Player && where.pandascoreId === player.pandascoreId) return player;
      return null;
    });
  }

  it("moves a known player to their current team and refreshes their profile", async () => {
    const oldTeam = Object.assign(new Team(), { id: "old", slug: "bigodes-rl" });
    const player = Object.assign(new Player(), {
      slug: "drufinho",
      pandascoreId: 1,
      name: "Drufinho_old",
      nationality: "PT",
      imageUrl: null,
      team: oldTeam,
    });
    givenStoredPlayer(player);
    pandascoreGateway.getRocketLeaguePlayers.mockResolvedValue([
      {
        id: 1,
        name: "Drufinho",
        slug: "drufinho-renamed",
        nationality: "BR",
        image_url: "https://cdn.pandascore.co/drufinho.png",
        current_team: { id: 10, name: "Team Secret", slug: "team-secret-rl" },
      },
    ]);

    await useCase.execute(false);

    expect(player.team).toEqual(expect.objectContaining({ slug: "team-secret-rl" }));
    expect(player.name).toBe("Drufinho");
    expect(player.nationality).toBe("BR");
    expect(player.imageUrl).toBe("https://cdn.pandascore.co/drufinho.png");
    expect(player.slug).toBe("drufinho");
  });

  it("detaches a known player PandaScore lists without a team", async () => {
    const team = Object.assign(new Team(), { id: "t", slug: "bigodes-rl" });
    const player = Object.assign(new Player(), { slug: "comm", pandascoreId: 2, team });
    givenStoredPlayer(player);
    pandascoreGateway.getRocketLeaguePlayers.mockResolvedValue([
      { id: 2, name: "Comm", slug: "comm" },
    ]);

    await useCase.execute(false);

    expect(player.team).toBeNull();
    expect(em.persist).toHaveBeenCalledWith(player);
  });
});
