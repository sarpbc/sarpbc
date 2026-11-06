import type { Player } from "@sarpbc/types";
import type { Team } from "@sarpbc/types";
import type { Tournament } from "~/types/tournament";

export interface AdminSearchResult {
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
}

export async function searchAdminEntities(query: string): Promise<AdminSearchResult> {
  try {
    const res = await apiFetch<Partial<AdminSearchResult>>("/search", {
      method: "GET",
      query: {
        q: query,
        type: "all",
        limit: 15,
      },
    });

    return {
      players: res.players ?? [],
      teams: res.teams ?? [],
      tournaments: res.tournaments ?? [],
    };
  } catch {
    return { players: [], teams: [], tournaments: [] };
  }
}
