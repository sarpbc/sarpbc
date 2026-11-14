import { describe, expect, it, vi } from "vitest";
import type { GameStatsStore } from "./ports";
import { TournamentPlayerStatsService } from "./tournament-player-stats.service";

function setup() {
  const playerLines = vi.fn<GameStatsStore["playerLines"]>(async (ids) =>
    ids.map((id) => ({
      gameId: `game-${id}`,
      account: "steam:1",
      player: { id: "zen", name: "zen", slug: "zen" },
      team: { id: "team-vit", name: "Vitality", slug: "vitality" },
      teamGoals: 3,
      goals: 1,
      assists: 1,
      saves: 1,
      shots: 2,
      demolitions: 0,
    })),
  );

  return { playerLines, service: new TournamentPlayerStatsService({ playerLines }) };
}

describe(TournamentPlayerStatsService, () => {
  it("aggregates every redistributable stage of an event together", async () => {
    const { service, playerLines } = setup();

    const stats = await service.forStages([
      { id: "group-stage", source: "manual" },
      { id: "qualifier", source: "startgg" },
      { id: "finals", source: "pandascore" },
    ]);

    expect(playerLines).toHaveBeenCalledWith(["group-stage", "finals"]);
    expect(stats).toMatchObject({ games: 2, players: [{ games: 2, totals: { goals: 2 } }] });
  });

  it("returns empty stats for a start.gg stage without reading its games", async () => {
    const { service, playerLines } = setup();

    await expect(
      service.forStages([{ id: "qualifier", source: "startgg" }]),
    ).resolves.toStrictEqual({
      games: 0,
      players: [],
      unlinkedAccounts: 0,
    });
    expect(playerLines).not.toHaveBeenCalled();
  });
});
