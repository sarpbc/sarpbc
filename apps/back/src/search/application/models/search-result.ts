import type { Player, Team } from "../../../player/domain/roster";
import type { Tournament } from "../../../tournament/domain/competition";

export type SearchType = "player" | "team" | "tournament" | "all";

export interface SearchResult {
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  total: {
    players: number;
    teams: number;
    tournaments: number;
  };
}

export interface SearchParams {
  query: string;
  type: SearchType;
  limit: number;
  offset: number;
}

export interface PlayerSearchParams {
  query: string;
  limit: number;
  offset: number;
}

export interface TeamSearchParams {
  query: string;
  limit: number;
  offset: number;
}

export interface TournamentSearchParams {
  query: string;
  limit: number;
  offset: number;
}
