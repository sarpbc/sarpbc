import type { Player, Team, TournamentListItem } from "@sarpbc/types";

const PICKER_RESULT_LIMIT = 10;

export type TournamentSearchResult = Pick<TournamentListItem, "id" | "name" | "event">;

export interface AdminSearchResult {
  players: Player[];
  teams: Team[];
  tournaments: (TournamentSearchResult & Pick<TournamentListItem, "imageUrl">)[];
}

export const searchAdminEntities = async (query: string) =>
  await apiFetch<AdminSearchResult>("/search", {
    method: "GET",
    query: { limit: 15, q: query, type: "all" },
  });

export const searchPlayers = async (query: string) =>
  await apiFetch<Player[]>("/search/players", {
    query: { limit: PICKER_RESULT_LIMIT, q: query },
  });

export const searchTeams = async (query: string) =>
  await apiFetch<Team[]>("/search/teams", {
    query: { limit: PICKER_RESULT_LIMIT, q: query },
  });

export const searchTournaments = async (query: string) =>
  await apiFetch<TournamentSearchResult[]>("/search/tournaments", {
    query: { limit: PICKER_RESULT_LIMIT, q: query },
  });
