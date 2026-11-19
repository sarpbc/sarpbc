import type { PlayerTally, StatsScope } from "../domain/player-stats";
import type { GameStatsStore } from "./ports";

export const fakePlayerStats = (tally: Omit<PlayerTally, "games">) => {
  const scopes: StatsScope[] = [];

  const playerStats: GameStatsStore["playerStats"] = async (scope) => {
    scopes.push(scope);

    const ids = scope.kind === "tournaments" ? scope.ids : [];

    return {
      games: ids.length,
      tallies: ids.map(() => ({ ...tally, games: 1 })),
      unlinkedAccounts: 0,
    };
  };

  return { playerStats, scopes };
};
