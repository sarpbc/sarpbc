import type { TournamentEventRef } from "./tournament-event";

export type DataSource = "pandascore" | "manual" | "startgg";

export type MatchVodSource = "twitch" | "youtube";

export interface MatchVod {
  game: number;
  url: string;
  language: string;
  source: MatchVodSource;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
}

export interface TournamentListItem {
  id: string;
  source: DataSource;
  name: string;
  slug: string;
  event: TournamentEventRef;
  type: string | null;
  prizepool: string | null;
  imageUrl: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  pickemsEnabled: boolean;
  winnerId: string | null;
  league: { id: string; name: string; imageUrl: string | null } | null;
  participants: { id: string; team: TeamSummary }[];
}

export interface TournamentMatchListItem {
  id: string;
  publicId: number;
  slug: string;
  status: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  numberOfGames: number | null;
  participants: { id: string; team: { id: string; name: string } }[];
  results: { participant: string; score: number }[];
}

export interface TournamentDetailParticipant {
  id: string;
  team: TeamSummary;
  players: { id: string; name: string; slug: string; nationality: string | null }[];
}

export interface TournamentDetailMatch {
  id: string;
  publicId: number;
  slug: string;
  name: string;
  status: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  numberOfGames: number | null;
  winnerId: string | null;
  participants: { id: string; team: TeamSummary }[];
  results: { participant: string; score: number }[];
  previousMatches: { previousMatch: string; type: "winner" | "loser" }[];
}

export interface TournamentDetail {
  id: string;
  source: DataSource;
  name: string;
  slug: string;
  event: TournamentEventRef;
  tier: string | null;
  type: string | null;
  country: string | null;
  prizepool: string | null;
  imageUrl: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  pickemsEnabled: boolean;
  hasBracket: boolean;
  league: { id: string; name: string; imageUrl: string | null; url: string | null } | null;
  winner: { id: string; team: TeamSummary } | null;
  participants: TournamentDetailParticipant[];
  matches: TournamentDetailMatch[];
}

export interface ProfileMatchListItem {
  id: string;
  publicId: number;
  slug: string;
  status: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  participants: { id: string; team: { name: string } }[];
  results: { participant: string; score: number }[];
  tournament: {
    id: string;
    name: string;
    slug: string;
    event: TournamentEventRef;
    league?: { id: string; name: string };
  };
}

export type MatchBlockState = "upcoming" | "live" | "finished";

export interface MatchBlockItem {
  id: string;
  publicId: number;
  slug: string;
  beginAt: Date | string | null;
  state: MatchBlockState;
  startgg: boolean;
  commentCount: number;
  participants: { id: string; team: { name: string } }[];
  results: { participant: string; score: number }[];
  tournament: {
    id: string;
    name: string;
    slug: string;
    event: TournamentEventRef;
    league?: { id: string; name: string };
  };
}

export interface MatchBlocksResponse {
  blocks: Record<string, MatchBlockItem[]>;
}
