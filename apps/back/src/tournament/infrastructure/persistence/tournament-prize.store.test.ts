import { describe, expect, it, vi } from "vitest";
import { CompetitionPrizeQueries, CompetitionPrizeWriter } from "./tournament-prize.store";
import { TournamentPrize } from "./tournament-prize.entities";

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

const startggExcluded = { tournament: { source: { $ne: "startgg" } } };

describe("CompetitionPrizeQueries", () => {
  it("excludes start.gg tournaments from redistributable earnings", async () => {
    const find = vi.fn().mockResolvedValue([]);
    const queries = new CompetitionPrizeQueries({ find } as never);

    await queries.byTeam("team-a", { redistributableOnly: true });
    await queries.byPlayer("player-a", { redistributableOnly: true });

    expect(find).toHaveBeenNthCalledWith(
      1,
      TournamentPrize,
      { $and: [{ team: { id: "team-a" } }, startggExcluded] },
      expect.anything(),
    );
    expect(find).toHaveBeenNthCalledWith(
      2,
      TournamentPrize,
      { $and: [{ players: { id: "player-a" } }, startggExcluded] },
      expect.anything(),
    );
  });

  it("keeps start.gg earnings for the site with their source", async () => {
    const find = vi.fn().mockResolvedValue([prizeRow(3)]);
    const queries = new CompetitionPrizeQueries({ find } as never);

    const [line] = await queries.byPlayer("player-a", { redistributableOnly: false });

    expect(find).toHaveBeenCalledWith(
      TournamentPrize,
      { $and: [{ players: { id: "player-a" } }, { tournament: {} }] },
      expect.anything(),
    );
    expect(line).toMatchObject({ shares: 3, amount: 900, tournament: { source: "startgg" } });
  });
});

describe("CompetitionPrizeWriter", () => {
  it("reports unknown and merged references", async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce([{ id: "team-a" }])
      .mockResolvedValueOnce([]);
    const writer = new CompetitionPrizeWriter({ find } as never);

    expect(
      await writer.missingReferences({ teamIds: ["team-a", "team-b"], playerIds: ["player-a"] }),
    ).toEqual(["team-b", "player-a"]);
    expect(find).toHaveBeenCalledWith(
      expect.anything(),
      { id: { $in: ["team-a", "team-b"] }, mergedInto: null },
      { fields: ["id"] },
    );
  });
});
