import type { ContractRole } from "./contract";
import type { Player } from "./player";
import type { PlayerProfileAward } from "./player-award";
import type { ProfileEarnings } from "./prize";
import type { PlayerSeasonAward } from "./season";
import type { TeamSummary } from "./team";
import type { TournamentEventRef } from "./tournament-event";

export interface SeriesRecord {
  wins: number;
  losses: number;
}

export interface CareerTitle {
  id: string;
  name: string;
  slug: string;
  endAt: string | null;
  event: TournamentEventRef;
}

export interface CareerStint {
  role: ContractRole;
  startDate: string;
  endDate: string | null;
  team: TeamSummary;
}

export interface PlayerCareer {
  player: Player;
  titles: CareerTitle[];
  teams: CareerStint[];
  series: SeriesRecord;
  earnings: ProfileEarnings;
  awards: PlayerProfileAward[];
  seasonAwards: PlayerSeasonAward[];
}

export interface HeadToHead {
  a: number;
  b: number;
}

export interface PlayerComparison {
  a: PlayerCareer;
  b: PlayerCareer;
  headToHead: HeadToHead;
}
