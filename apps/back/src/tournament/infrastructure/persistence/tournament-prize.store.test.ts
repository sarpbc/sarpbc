import { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";
import { unconstructed } from "../../../../test/doubles";
import { CompetitionPrizeQueries } from "./tournament-prize.queries";
import { CompetitionPrizeWriter } from "./tournament-prize.writer";

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
  },
});

describe(CompetitionPrizeQueries, () => {
  it("reports an earnings line with its share count, amount and tournament dates", async () => {
    const queries = new CompetitionPrizeQueries(
      Object.assign(unconstructed(EntityManager), { find: async () => [prizeRow(3)] }),
    );

    const [line] = await queries.byPlayer("player-a");

    expect(line).toMatchObject({
      amount: 900,
      shares: 3,
      tournament: { beginAt: null, endAt: "2026-02-01T00:00:00.000Z" },
    });
  });
});

describe(CompetitionPrizeWriter, () => {
  it("lists each participant with its tournament roster", async () => {
    const rows = [
      {
        players: { getItems: () => [{ id: "player-a" }, { id: "player-b" }] },
        team: { id: "team-a" },
      },
    ];

    const writer = new CompetitionPrizeWriter(
      Object.assign(unconstructed(EntityManager), { find: async () => rows }),
    );

    await expect(writer.participants("cup")).resolves.toStrictEqual([
      { playerIds: ["player-a", "player-b"], teamId: "team-a" },
    ]);
  });
});
