import type { Player } from "~/types/player";
import type { Team } from "~/types/team";
import { apiFetch } from "~/utils/apiFetch";

export interface SearchResult {
  teams: Team[];
  players: Player[];
  total: { teams: number; players: number };
}

export async function searchTeamsAndPlayers({ query }: { query?: string }): Promise<SearchResult> {
  try {
    const res = await apiFetch<Partial<SearchResult>>(`/search`, {
      method: "GET",
      params: {
        q: query,
        type: "all",
      },
    });

    const searchResult: SearchResult = {
      teams: res.teams ?? [],
      players: res.players ?? [],
      total: {
        teams: res.total?.teams ?? 0,
        players: res.total?.players ?? 0,
      },
    };

    return searchResult;
  } catch {
    return { teams: [], players: [], total: { teams: 0, players: 0 } };
  }
}
