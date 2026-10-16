import type { EntityManager } from "@mikro-orm/postgresql";
import { Player as PlayerRow } from "./player.entities";
import { Player } from "../../domain/roster";
import { rosterStores } from "./roster.store";

function fixture() {
  const execute = jest.fn();
  const findOne = jest.fn();
  const manager: Pick<EntityManager, "getConnection" | "findOne"> = {
    getConnection: jest.fn().mockReturnValue({ execute }),
    findOne,
  };

  return { execute, findOne, players: rosterStores(manager as EntityManager).players };
}

describe("rosterStores.players.getRandomPlayer", () => {
  it("loads a single random row and maps it to a detached player", async () => {
    const { execute, findOne, players } = fixture();
    const row = Object.assign(new PlayerRow(), {
      id: "p1",
      name: "Vatira",
      slug: "vatira",
    });
    execute.mockResolvedValue([{ id: row.id }]);
    findOne.mockResolvedValue(row);

    const result = await players.getRandomPlayer();

    expect(execute).toHaveBeenCalledWith("SELECT id FROM player ORDER BY random() LIMIT 1");
    expect(findOne).toHaveBeenCalledWith(
      PlayerRow,
      { id: row.id },
      { populate: ["team", "photos"] },
    );
    expect(result).toBeInstanceOf(Player);
    expect(result).not.toBe(row);
    expect(result).toMatchObject({ id: "p1", name: "Vatira", slug: "vatira", photos: [] });
  });

  it("returns null when the table is empty without loading a player", async () => {
    const { execute, findOne, players } = fixture();
    execute.mockResolvedValue([]);

    await expect(players.getRandomPlayer()).resolves.toBeNull();

    expect(execute).toHaveBeenCalledWith("SELECT id FROM player ORDER BY random() LIMIT 1");
    expect(findOne).not.toHaveBeenCalled();
  });
});
