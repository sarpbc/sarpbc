import type { Player, Team, TournamentListItem } from "@sarpbc/types";

const PICKER_RESULT_LIMIT = 10;

export type TournamentSearchResult = Pick<TournamentListItem, "id" | "name" | "event">;

export interface AdminSearchResult {
  players: Player[];
  teams: Team[];
  tournaments: (TournamentSearchResult & Pick<TournamentListItem, "imageUrl">)[];
}

export async function searchAdminEntities(query: string): Promise<AdminSearchResult> {
  return await apiFetch<AdminSearchResult>("/search", {
    method: "GET",
    query: { q: query, type: "all", limit: 15 },
  });
}

export async function searchPlayers(query: string): Promise<Player[]> {
  return await apiFetch<Player[]>("/search/players", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });
}

export async function searchTeams(query: string): Promise<Team[]> {
  return await apiFetch<Team[]>("/search/teams", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });
}

export async function searchTournaments(query: string): Promise<TournamentSearchResult[]> {
  return await apiFetch<TournamentSearchResult[]>("/search/tournaments", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });
}
