import type { Player, Team } from "@sarpbc/types";

export interface SearchResult {
  teams: Team[];
  players: Player[];
  total: { teams: number; players: number };
}

export const searchTeamsAndPlayers = async ({
  query,
}: {
  query?: string;
}): Promise<SearchResult> => {
  try {
    return await apiFetch<SearchResult>(`/search`, {
      method: "GET",
      query: {
        q: query,
        type: "all",
      },
    });
  } catch {
    return { teams: [], players: [], total: { teams: 0, players: 0 } };
  }
};
