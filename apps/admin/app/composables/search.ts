import type { Player, Team, TournamentListItem } from "@sarpbc/types";

export interface AdminSearchResult {
  players: Player[];
  teams: Team[];
  tournaments: Pick<TournamentListItem, "id" | "name" | "event" | "imageUrl">[];
}

export async function searchAdminEntities(query: string): Promise<AdminSearchResult> {
  try {
    return await apiFetch<AdminSearchResult>("/search", {
      method: "GET",
      query: {
        q: query,
        type: "all",
        limit: 15,
      },
    });
  } catch {
    return { players: [], teams: [], tournaments: [] };
  }
}
