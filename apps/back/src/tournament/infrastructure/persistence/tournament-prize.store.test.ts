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
  amount: 900,
  currency: "EUR",
  id: "prize-1",
  placement: 2,
  players: { getItems: () => [], length: playerCount },
  team: { darkModeImageUrl: null, id: "team-a", imageUrl: null, name: "Team A", slug: "team-a" },
  tournament: {
    beginAt: null,
    endAt: new Date("2026-02-01T00:00:00Z"),
    event: { id: "e1", name: "Fake Cup", slug: "fake-cup" },
    id: "t1",
    name: "Main Event",
    slug: "main-event",
    source: "startgg",
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
      amount: 900,
      shares: 3,
      tournament: { beginAt: null, endAt: "2026-02-01T00:00:00.000Z", source: "startgg" },
    });
  });
});

describe(CompetitionPrizeWriter, () => {
  it("lists each participant with its tournament roster", async () => {
    const find = vi.fn<Find>().mockResolvedValue([
      {
        players: { getItems: () => [{ id: "player-a" }, { id: "player-b" }] },
        team: { id: "team-a" },
      },
    ]);

    const writer = new CompetitionPrizeWriter(
      Object.assign(unconstructed(EntityManager), {
        count: vi.fn<() => Promise<number>>(),
        find,
        getReference: vi.fn<() => object>(),
        nativeDelete: vi.fn<() => Promise<number>>(),
        persist: vi.fn<() => void>(),
      }),
    );

    await expect(writer.participants("cup")).resolves.toStrictEqual([
      { playerIds: ["player-a", "player-b"], teamId: "team-a" },
    ]);
  });
});
