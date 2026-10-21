import type { TeamSummary, TournamentDetailMatch } from "@sarpbc/types";
import type { MatchResult } from "~/types/matches";

export type BracketZone = "upper" | "lower";

export type TournamentBracketFormat =
  | "flat-stage"
  | "linked-single-elimination"
  | "linked-double-elimination"
  | "bracket-missing-links";

export interface TournamentBracketRoundGroup {
  round: string;
  matches: TournamentDetailMatch[];
}

export interface BracketLayoutMatch {
  matchId: string;
  publicId: number;
  slug: string;
  column: number;
  row: number;
  zone?: BracketZone;
  name: string;
  teamA?: TeamSummary;
  teamB?: TeamSummary;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  winnerParticipantId: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  status: string | null;
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
  lowerBracketFlatMatches: TournamentDetailMatch[];
  flatMatches: TournamentDetailMatch[];
  groupedMatches: TournamentBracketRoundGroup[];
}
