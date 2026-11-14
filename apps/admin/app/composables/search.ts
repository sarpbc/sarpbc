import type { Player, Team, TournamentListItem } from "@sarpbc/types";

const PICKER_RESULT_LIMIT = 10;

export type TournamentSearchResult = Pick<TournamentListItem, "id" | "name" | "event">;

export interface AdminSearchResult {
  players: Player[];
  teams: Team[];
  tournaments: (TournamentSearchResult & Pick<TournamentListItem, "imageUrl">)[];
}

export const searchAdminEntities = async (query: string): Promise<AdminSearchResult> =>
  await apiFetch<AdminSearchResult>("/search", {
    method: "GET",
    query: { q: query, type: "all", limit: 15 },
  });

export const searchPlayers = async (query: string): Promise<Player[]> =>
  await apiFetch<Player[]>("/search/players", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });

export const searchTeams = async (query: string): Promise<Team[]> =>
  await apiFetch<Team[]>("/search/teams", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });

export const searchTournaments = async (query: string): Promise<TournamentSearchResult[]> =>
  await apiFetch<TournamentSearchResult[]>("/search/tournaments", {
    query: { q: query, limit: PICKER_RESULT_LIMIT },
  });
