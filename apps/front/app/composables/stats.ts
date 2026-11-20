import type { StatsEra, StatsGrouping, TournamentPlayerStatsResponse } from "@sarpbc/types";

export const getPlayerStatsLeaderboard = async (era: StatsEra | null, by: StatsGrouping) =>
  await apiFetch<TournamentPlayerStatsResponse>("/stats/players", {
    method: "GET",
    query: { by, era: era ?? undefined },
  });
