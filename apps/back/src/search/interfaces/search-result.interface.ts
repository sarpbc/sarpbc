import { Player } from "../../player/domain/player.entity";
import { Team } from "../../team/domain/team.entity";

export interface SearchResult {
  players: Player[];
  teams: Team[];
  total: {
    players: number;
    teams: number;
  };
}

export interface SearchParams {
  query: string;
  type: "player" | "team" | "all";
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
