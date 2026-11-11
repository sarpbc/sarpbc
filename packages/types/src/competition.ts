import type { TeamLogos, TeamSummary } from "./team";
import type { TournamentEventRef } from "./tournament-event";

export const DATA_SOURCES = ["pandascore", "manual", "startgg"] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

export const TOURNAMENT_FORMATS = ["1v1", "2v2", "3v3"] as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export interface ParticipantPlayer {
  id: string;
  name: string;
  slug: string;
}

export type ParticipantRef<TTeam> =
  | { id: string; team: TTeam; players?: undefined }
  | { id: string; team: null; players: ParticipantPlayer[] };

export type MatchVodSource = "twitch" | "youtube";

export interface MatchVod {
  game: number;
  url: string;
  language: string;
  source: MatchVodSource;
}

export interface TournamentListItem {
  id: string;
  source: DataSource;
  format: TournamentFormat;
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
  participants: ParticipantRef<TeamSummary>[];
}

export interface TournamentMatchListItem {
  id: string;
  publicId: number;
  slug: string;
  status: string | null;
  beginAt: Date | string | null;
  endAt: Date | string | null;
  numberOfGames: number | null;
  participants: ParticipantRef<TeamLogos & { id: string; name: string }>[];
  results: { participant: string; score: number }[];
}

export interface TournamentDetailParticipant {
  id: string;
  team: TeamSummary | null;
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
  participants: ParticipantRef<TeamSummary>[];
  results: { participant: string; score: number }[];
  previousMatches: { previousMatch: string; type: "winner" | "loser" }[];
}

export interface TournamentDetail {
  id: string;
  source: DataSource;
  format: TournamentFormat;
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
  winner: ParticipantRef<TeamSummary> | null;
  participants: TournamentDetailParticipant[];
  matches: TournamentDetailMatch[];
}

export interface MatchListItem {
  id: string;
  publicId: number;
  slug: string;
  beginAt: string | null;
  participants: ParticipantRef<TeamLogos & { name: string }>[];
  results: { participant: string; score: number }[];
  tournament: {
    id: string;
    name: string;
    slug: string;
    event: TournamentEventRef;
    league?: { id: string; name: string };
  };
}

export interface CountedMatchListItem extends MatchListItem {
  commentCount: number;
}

export interface UpcomingMatchesResponse {
  live: CountedMatchListItem[];
  upcoming: CountedMatchListItem[];
  liveTotal: number;
  upcomingTotal: number;
  total: number;
}

export interface MatchResultsResponse {
  results: CountedMatchListItem[];
  total: number;
}

export interface ProfileMatchListItem extends MatchListItem {
  status: string | null;
  endAt: Date | string | null;
}

export type MatchBlockSelector =
  | { kind: "match"; id: string }
  | { kind: "matches"; ids: string[] }
  | { kind: "tournament"; id: string; limit: number }
  | { kind: "team"; id: string; limit: number };

export type MatchBlockState = "upcoming" | "live" | "finished";

export interface MatchBlockItem extends CountedMatchListItem {
  state: MatchBlockState;
  startgg: boolean;
}

export interface MatchBlocksResponse {
  blocks: Record<string, MatchBlockItem[]>;
}
