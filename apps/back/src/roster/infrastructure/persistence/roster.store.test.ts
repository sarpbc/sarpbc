import { describe, expect, it, vi } from "vitest";
import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { Player as PlayerRow } from "./player.entity";
import { Player } from "../../domain/player";
import { MikroPlayerStore } from "./player.store";

function fixture() {
  const execute = vi.fn();
  const findOne = vi.fn();

  const manager = Object.assign(unconstructed(EntityManager), {
    getConnection: vi.fn().mockReturnValue({ execute }),
    findOne,
  });

  return { execute, findOne, players: new MikroPlayerStore(manager) };
}

describe("MikroPlayerStore.getRandomPlayer", () => {
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

    expect(result).toBeInstanceOf(Player);
    expect(result).not.toBe(row);
    expect(result).toMatchObject({ id: "p1", name: "Vatira", slug: "vatira", photos: [] });
  });

  it("returns null when the table is empty without loading a player", async () => {
    const { execute, findOne, players } = fixture();
    execute.mockResolvedValue([]);

    await expect(players.getRandomPlayer()).resolves.toBeNull();

    expect(findOne).not.toHaveBeenCalled();
  });
});
