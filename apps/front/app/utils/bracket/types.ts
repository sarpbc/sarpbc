import type { Match } from "~/types/matches";
import type { MatchResult } from "~/types/matches";
import type { Team } from "~/types/team";

export type BracketZone = "upper" | "lower";

export type TournamentBracketFormat =
  | "flat-stage"
  | "linked-single-elimination"
  | "linked-double-elimination"
  | "bracket-missing-links";

export interface TournamentBracketRoundGroup {
  round: string;
  matches: Match[];
}

export interface BracketLayoutMatch {
  matchId: string;
  column: number;
  row: number;
  zone?: BracketZone;
  name?: string;
  teamA?: Team;
  teamB?: Team;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  winnerParticipantId: string | null;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
}

export interface BracketConnector {
  fromMatchId: string;
  toMatchId: string;
  linkType: "winner" | "loser";
  targetSlot: "a" | "b";
}

export interface BracketSectionLayout {
  matches: BracketLayoutMatch[];
  connectors: BracketConnector[];
  columnCount: number;
  rowCount: number;
}

export interface TournamentBracketView {
  format: TournamentBracketFormat;
  upperLayout: BracketSectionLayout | null;
  /** Lower bracket + cross-bracket semifinals/grand final on a single Liquipedia-like grid. */
  doubleEliminationLayout: BracketSectionLayout | null;
  lowerBracketFlatMatches: Match[];
  flatMatches: Match[];
  groupedMatches: TournamentBracketRoundGroup[];
}
