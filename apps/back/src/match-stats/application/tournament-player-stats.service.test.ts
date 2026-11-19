import { describe, expect, it } from "vitest";
import type { StatsScope } from "../domain/player-stats";
import { TournamentPlayerStatsService } from "./tournament-player-stats.service";

const scopes: StatsScope[] = [];

const service = new TournamentPlayerStatsService({
  playerStats: async (scope) => {
    scopes.push(scope);

    return {
      games: 2,
      tallies: [
        {
          games: 2,
          player: { id: "zen", name: "zen", slug: "zen" },
          team: { id: "team-vit", name: "Vitality", slug: "vitality" },
          teamGoals: 6,
          totals: { assists: 2, demolitions: 0, goals: 2, saves: 2, shots: 4 },
        },
      ],
      unlinkedAccounts: 0,
    };
  },
});

describe(TournamentPlayerStatsService, () => {
  it("aggregates only the redistributable stages of an event", async () => {
    scopes.length = 0;

    const stats = await service.forStages([
      { id: "group-stage", source: "manual" },
      { id: "qualifier", source: "startgg" },
      { id: "finals", source: "pandascore" },
    ]);

    expect(scopes).toStrictEqual([{ ids: ["group-stage", "finals"], kind: "tournaments" }]);
    expect(stats).toMatchObject({ games: 2, players: [{ games: 2, totals: { goals: 2 } }] });
  });

  it("returns empty stats for a start.gg stage without querying", async () => {
    scopes.length = 0;

    await expect(
      service.forStages([{ id: "qualifier", source: "startgg" }]),
    ).resolves.toStrictEqual({ games: 0, players: [], unlinkedAccounts: 0 });
    expect(scopes).toStrictEqual([]);
  });

  it("aggregates every redistributable tournament into the overall leaderboard", async () => {
    scopes.length = 0;

    await expect(service.overall()).resolves.toMatchObject({ games: 2, players: [{ games: 2 }] });
    expect(scopes).toStrictEqual([{ kind: "redistributable", minGames: 10 }]);
  });
});
