import type { SearchType } from "@sarpbc/types";
import type { Player, Team } from "../../../roster/domain/roster";
import type { Tournament } from "../../../tournament/domain/competition";

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
