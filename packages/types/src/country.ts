import type { MatchListItem } from "./competition";
import type { Player } from "./player";
import type { TeamSummary } from "./team";

export interface CountrySummary {
  code: string;
  playerCount: number;
}

export interface CountryDetail {
  code: string;
  players: Player[];
  teams: TeamSummary[];
  matches: MatchListItem[];
  matchTotal: number;
}
