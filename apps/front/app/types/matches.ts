import type { BracketLink, Tournament, TournamentParticipant } from "./tournament";
import type { OfficialMatchStream } from "~/utils/officialStream";

export interface MatchResult {
  participant: string;
  score: number;
}

export function getMatchParticipantScore(
  results: MatchResult[] | undefined,
  participantId: string | undefined,
): number | null {
  if (!results || !participantId || results.length === 0) {
    return null;
  }

  const result = results.find((entry) => entry.participant === participantId);

  return result?.score ?? null;
}

export interface MatchListTournament {
  id: string;
  name: string;
  serie?: string | null;
  league?: { id: string; name: string };
}

export interface MatchListParticipant {
  id: string;
  team: { name: string };
}

export interface MatchListItem {
  id: string;
  beginAt?: Date | null;
  participants?: MatchListParticipant[];
  results?: MatchResult[];
  tournament: MatchListTournament;
  commentCount?: number;
}

export interface UpcomingMatchesResponse {
  live: MatchListItem[];
  upcoming: MatchListItem[];
  liveTotal: number;
  upcomingTotal: number;
  total: number;
}

export interface MatchResultsResponse {
  results: MatchListItem[];
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

export interface HeadToHeadMeeting {
  id: string;
  beginAt?: Date;
  endAt?: Date;
  tournamentLabel: string;
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
}

export interface HeadToHead {
  teamAId: string;
  teamBId: string;
  teamAWins: number;
  teamBWins: number;
  totalMeetings: number;
  recentMeetings: HeadToHeadMeeting[];
}

export interface MatchDetailResponse {
  match: Match;
  teamForms: TeamFormsMap;
  headToHead: HeadToHead | null;
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
  officialStreams?: OfficialMatchStream[];
}

export type MatchStatus = "upcoming" | "live" | "finished";
