import type { StatsEra, TournamentPlayerStatsResponse } from "@sarpbc/types";

export const getPlayerStatsLeaderboard = async (era: StatsEra | null) =>
  await apiFetch<TournamentPlayerStatsResponse>("/stats/players", {
    method: "GET",
    query: era ? { era } : undefined,
  });
