import type { Player, Team } from "@sarpbc/types";

export interface SearchResult {
  teams: Team[];
  players: Player[];
  total: { teams: number; players: number };
}

export const searchTeamsAndPlayers = async ({ query }: { query?: string }) => {
  try {
    return await apiFetch<SearchResult>(`/search`, {
      method: "GET",
      query: {
        q: query,
        type: "all",
      },
    });
  } catch {
    return { players: [], teams: [], total: { players: 0, teams: 0 } };
  }
};
