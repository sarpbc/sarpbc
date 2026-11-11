import type { MatchGameStats, MatchListItem, MatchVod, ParticipantRef } from "@sarpbc/types";
import type { ThemedLogo } from "@sarpbc/utils";
import type { BracketLink, Tournament, TournamentParticipant } from "./tournament";
import type { OfficialMatchStream } from "~/utils/officialStream";

export interface MatchResult {
  participant: string;
  score: number;
}

export type MatchEventGroup = {
  key: string;
  displayName: string;
  matchesPath: string;
  matches: MatchListItem[];
};

export interface MatchRowItem {
  id: string;
  publicId: number;
  slug: string;
  beginAt?: Date | string | null;
  participants?: ParticipantRef<ThemedLogo & { name: string }>[];
  results?: MatchResult[];
}

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
  publicId: number;
  slug: string;
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
  publicId: number;
  slug: string;
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
  games: MatchGameStats[];
}

/** The detail endpoint serializes the stored match, so result participants are objects there. */
export interface MatchDetailWire extends Omit<MatchDetailResponse, "match"> {
  match: Omit<Match, "results"> & { results: { participant: { id: string }; score: number }[] };
}

export interface Match {
  id: string;
  publicId: number;
  pandascoreId?: number;
  name: string;
  slug: string;
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
  vods?: MatchVod[];
}

export type MatchLinkTarget = Pick<Match, "id" | "publicId" | "slug">;

export type MatchStatus = "upcoming" | "live" | "finished";
