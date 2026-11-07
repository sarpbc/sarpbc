import { describe, expect, it, vi } from "vitest";
import { CompetitionPrizeQueries, CompetitionPrizeWriter } from "./tournament-prize.store";

function prizeRow(playerCount: number) {
  return {
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
  };
}

describe("CompetitionPrizeQueries", () => {
  it("reports an earnings line with its share count, amount and tournament source", async () => {
    const find = vi.fn().mockResolvedValue([prizeRow(3)]);
    const queries = new CompetitionPrizeQueries({ find, findOne: vi.fn() });

    const [line] = await queries.byPlayer("player-a", { redistributableOnly: false });

    expect(line).toMatchObject({
      shares: 3,
      amount: 900,
      tournament: { source: "startgg", beginAt: null, endAt: "2026-02-01T00:00:00.000Z" },
    });
  });
});

describe("CompetitionPrizeWriter", () => {
  it("lists each participant with its tournament roster", async () => {
    const find = vi.fn().mockResolvedValue([
      {
        team: { id: "team-a" },
        players: { getItems: () => [{ id: "player-a" }, { id: "player-b" }] },
      },
    ]);
    const writer = new CompetitionPrizeWriter({
      count: vi.fn(),
      find,
      nativeDelete: vi.fn(),
      getReference: vi.fn(),
      persist: vi.fn(),
    });

    expect(await writer.participants("cup")).toEqual([
      { teamId: "team-a", playerIds: ["player-a", "player-b"] },
    ]);
  });
});
