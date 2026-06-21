import type { BracketLink, Tournament, TournamentParticipant } from "./tournament";

export interface MatchResult {
  participant: string | { id: string };
  score: number;
}

export function getResultParticipantId(participant: MatchResult["participant"]): string {
  return typeof participant === "string" ? participant : participant.id;
}

export interface UpcomingMatchesResponse {
  live: Match[];
  upcoming: Match[];
  liveTotal: number;
  upcomingTotal: number;
  total: number;
}

export interface MatchResultsResponse {
  results: Match[];
  total: number;
}

export type MatchesPageData = UpcomingMatchesResponse | MatchResultsResponse;

export interface TeamFormRecord {
  wins: number;
  losses: number;
}

export interface TeamFormOpponent {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
}

export interface TeamFormMatchScore {
  team: number | null;
  opponent: number | null;
}

export interface TeamFormMatchEntry {
  id: string;
  beginAt?: Date;
  endAt?: Date;
  opponent: TeamFormOpponent;
  score: TeamFormMatchScore;
  outcome: "win" | "loss" | null;
}

export interface TeamForm {
  recent: TeamFormMatchEntry[];
  record: TeamFormRecord;
}

export type TeamFormsMap = Record<string, TeamForm>;

export interface MatchDetailResponse {
  match: Match;
  teamForms: TeamFormsMap;
}

export interface Match {
  id: string;
  pandascoreId?: number;
  name: string;
  slug?: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  participants?: TournamentParticipant[];
  winner?: TournamentParticipant;
  numberOfGames?: number;
  results?: MatchResult[];
  createdAt: Date;
  updatedAt: Date;
  tournament: Tournament;
  previousMatches?: BracketLink[];
}
