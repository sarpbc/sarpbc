import type { SearchType } from "@sarpbc/types";
import type { Player } from "../../../roster/domain/player";
import type { Team } from "../../../roster/domain/team";
import type { Tournament } from "../../../tournament/domain/tournament";

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
