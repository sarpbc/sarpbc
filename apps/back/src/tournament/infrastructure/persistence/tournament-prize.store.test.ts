import type { EntityName, FindOptions } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";
import { unconstructed } from "../../../../test/doubles";
import { CompetitionPrizeQueries } from "./tournament-prize.queries";
import { CompetitionPrizeWriter } from "./tournament-prize.writer";

type Find = (
  entity: EntityName<object>,
  where: Parameters<EntityManager["find"]>[1],
  options?: FindOptions<object>,
) => Promise<unknown[]>;

const prizeRow = (playerCount: number) => ({
  id: "prize-1",
  placement: 2,
  amount: 900,
  currency: "EUR",
  team: { id: "team-a", name: "Team A", slug: "team-a", imageUrl: null, darkModeImageUrl: null },
  players: { length: playerCount, getItems: () => [] },
  tournament: {
    id: "t1",
    name: "Main Event",
    slug: "main-event",
    source: "startgg",
    beginAt: null,
    endAt: new Date("2026-02-01T00:00:00Z"),
    event: { id: "e1", slug: "fake-cup", name: "Fake Cup" },
  },
});

describe(CompetitionPrizeQueries, () => {
  it("reports an earnings line with its share count, amount and tournament source", async () => {
    const find = vi.fn<Find>().mockResolvedValue([prizeRow(3)]);

    const queries = new CompetitionPrizeQueries(
      Object.assign(unconstructed(EntityManager), {
        find,
        findOne: vi.fn<() => Promise<null>>(),
      }),
    );

    const [line] = await queries.byPlayer("player-a", { redistributableOnly: false });

    expect(line).toMatchObject({
      shares: 3,
      amount: 900,
      tournament: { source: "startgg", beginAt: null, endAt: "2026-02-01T00:00:00.000Z" },
    });
  });
});

describe(CompetitionPrizeWriter, () => {
  it("lists each participant with its tournament roster", async () => {
    const find = vi.fn<Find>().mockResolvedValue([
      {
        team: { id: "team-a" },
        players: { getItems: () => [{ id: "player-a" }, { id: "player-b" }] },
      },
    ]);

    const writer = new CompetitionPrizeWriter(
      Object.assign(unconstructed(EntityManager), {
        count: vi.fn<() => Promise<number>>(),
        find,
        nativeDelete: vi.fn<() => Promise<number>>(),
        getReference: vi.fn<() => object>(),
        persist: vi.fn<() => void>(),
      }),
    );

    await expect(writer.participants("cup")).resolves.toStrictEqual([
      { teamId: "team-a", playerIds: ["player-a", "player-b"] },
    ]);
  });
});
