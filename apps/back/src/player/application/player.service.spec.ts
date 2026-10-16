import { Player, PlayerPhoto } from "../domain/roster";
import { PlayerService } from "./player.service";
import type { RosterStores } from "./ports/roster-transaction";

describe("PlayerService profile photos", () => {
  const player = Object.assign(new Player(), { id: "player", imageUrl: "old.png" });
  let gallery: PlayerPhoto[];
  let service: PlayerService;
  let transactions: number;
  const stores: RosterStores = {
    players: {
      search: async () => [],
      searchAndCount: async () => [[], 0],
      findById: async (id) => (id === player.id ? player : null),
      findBySlug: async () => null,
      getRandomPlayer: async () => null,
      save: async () => {},
      delete: async () => {},
    },
    photos: {
      findByPlayer: async () => gallery,
      findById: async (id) => gallery.find((photo) => photo.id === id) ?? null,
      save: async (photo) => {
        gallery.push(photo);
      },
      delete: async (photo) => {
        gallery = gallery.filter((existing) => existing !== photo);
      },
    },
    contracts: {
      findByPlayer: async () => [],
      findPastContractsByPlayer: async () => [],
      findByTeam: async () => [],
      findFormerPlayersByTeam: async () => [],
      findById: async () => null,
      findActiveContract: async () => null,
      save: async () => {},
      delete: async () => {},
    },
    teams: {
      search: async () => [],
      searchAndCount: async () => [[], 0],
      findById: async () => null,
      findBySlug: async () => null,
      findWithPlayers: async () => null,
      findAllTeams: async () => [],
      save: async () => {},
      delete: async () => {},
    },
  };
  beforeEach(() => {
    player.imageUrl = "old.png";
    gallery = [Object.assign(new PlayerPhoto(), { id: "selected", player, url: "selected.png" })];
    transactions = 0;
    service = new PlayerService(stores.players, stores.photos, stores.teams, {
      run: async (work) => {
        transactions += 1;
        return work(stores);
      },
    });
  });

  it("archives the previous profile and consumes the selected gallery photo in one transaction", async () => {
    expect((await service.setProfilePhoto(player.id, "selected")).imageUrl).toBe("selected.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["old.png"]);
    expect(transactions).toBe(1);
  });

  it("archives a replaced profile when editing player details", async () => {
    await service.update(player.id, { imageUrl: "new.png" });
    expect(player.imageUrl).toBe("new.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["selected.png", "old.png"]);
    expect(transactions).toBe(1);
  });

  it("rejects a gallery photo belonging to another player", async () => {
    gallery[0].player = Object.assign(new Player(), { id: "someone-else" });
    await expect(service.setProfilePhoto(player.id, "selected")).rejects.toThrow("not found");
    expect(player.imageUrl).toBe("old.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["selected.png"]);
  });
});
