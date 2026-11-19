import type { TournamentPlayerStatsResponse } from "@sarpbc/types";

export const getPlayerStatsLeaderboard = async () =>
  await apiFetch<TournamentPlayerStatsResponse>("/stats/players", { method: "GET" });
