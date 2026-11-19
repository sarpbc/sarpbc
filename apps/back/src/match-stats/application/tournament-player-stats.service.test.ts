import { describe, expect, it } from "vitest";
import type { PlayerGameLine } from "../domain/player-stats";
import { TournamentPlayerStatsService } from "./tournament-player-stats.service";

const line = (gameId: string) =>
  ({
    account: "steam:1",
    assists: 1,
    demolitions: 0,
    gameId,
    goals: 1,
    player: { id: "zen", name: "zen", slug: "zen" },
    saves: 1,
    shots: 2,
    team: { id: "team-vit", name: "Vitality", slug: "vitality" },
    teamGoals: 3,
  }) satisfies PlayerGameLine;

const service = new TournamentPlayerStatsService({
  playerLines: async (ids: string[]) => ids.map((id) => line(`game-${id}`)),
  redistributablePlayerLines: async () => [line("game-a"), line("game-b"), line("game-c")],
});

describe(TournamentPlayerStatsService, () => {
  it("aggregates every redistributable stage of an event together", async () => {
    const stats = await service.forStages([
      { id: "group-stage", source: "manual" },
      { id: "qualifier", source: "startgg" },
      { id: "finals", source: "pandascore" },
    ]);

    expect(stats).toMatchObject({ games: 2, players: [{ games: 2, totals: { goals: 2 } }] });
  });

  it("returns empty stats for a start.gg stage", async () => {
    await expect(
      service.forStages([{ id: "qualifier", source: "startgg" }]),
    ).resolves.toStrictEqual({
      games: 0,
      players: [],
      unlinkedAccounts: 0,
    });
  });

  it("aggregates every redistributable tournament into the overall leaderboard", async () => {
    await expect(service.overall()).resolves.toMatchObject({
      games: 3,
      players: [{ games: 3, totals: { goals: 3 } }],
    });
  });
});
