import { describe, expect, it } from "vitest";
import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { Player as PlayerRow } from "./player.entity";
import { Player } from "../../domain/player";
import { MikroPlayerStore } from "./player.store";

const fixture = () => {
  const database = {
    randomIds: Array.of<{ id: string }>(),
    rows: Array.of<PlayerRow>(),
  };

  const manager = Object.assign(unconstructed(EntityManager), {
    findOne: async () => database.rows[0] ?? null,
    getConnection: () => ({ execute: async () => database.randomIds }),
  });

  return { database, players: new MikroPlayerStore(manager) };
};

describe("MikroPlayerStore.getRandomPlayer", () => {
  it("loads a single random row and maps it to a detached player", async () => {
    const { database, players } = fixture();

    const row = Object.assign(new PlayerRow(), {
      id: "p1",
      name: "Vatira",
      slug: "vatira",
    });

    database.randomIds.push({ id: row.id });
    database.rows.push(row);

    const result = await players.getRandomPlayer();

    expect(result).toBeInstanceOf(Player);
    expect(result).not.toBe(row);
    expect(result).toMatchObject({ id: "p1", name: "Vatira", photos: [], slug: "vatira" });
  });

  it("returns null when the table is empty", async () => {
    const { players } = fixture();

    await expect(players.getRandomPlayer()).resolves.toBeNull();
  });
});
