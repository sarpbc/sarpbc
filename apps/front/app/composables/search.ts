import type { Player } from "@sarpbc/types";
import type { Team } from "@sarpbc/types";
import { apiFetch } from "~/utils/apiFetch";

export interface SearchResult {
  teams: Team[];
  players: Player[];
  total: { teams: number; players: number };
}

export async function searchTeamsAndPlayers({ query }: { query?: string }): Promise<SearchResult> {
  try {
    return await apiFetch<SearchResult>(`/search`, {
      method: "GET",
      params: {
        q: query,
        type: "all",
      },
    });
  } catch {
    return { teams: [], players: [], total: { teams: 0, players: 0 } };
  }
}
