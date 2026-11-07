import type { OfficialMatchStream } from "../domain/official-match-stream";
export interface ManualTournamentFields {
  eventId?: string;
  slug?: string;
  tier?: string | null;
  leagueId?: string | null;
  beginAt?: string | null;
  endAt?: string | null;
  imageUrl?: string | null;
  teamIds?: string[];
}
export interface CreateTournamentInput extends ManualTournamentFields {
  name: string;
  source?: "manual" | "startgg";
}
export interface ParticipantRosterInput {
  teamId: string;
  playerIds: string[];
}
export interface UpdateTournamentInput extends ManualTournamentFields {
  name?: string;
  rosters?: ParticipantRosterInput[];
}
export interface CreateEventInput {
  name: string;
  slug?: string;
  leagueId?: string | null;
}
export interface UpdateEventInput {
  name?: string;
  slug?: string;
  leagueId?: string | null;
}
export interface CreateLeagueInput {
  name: string;
  slug?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}
export interface UpdateLeagueInput {
  name?: string;
  slug?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}
export interface MatchFields {
  name: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  numberOfGames?: number;
  participantIds: string[];
  results?: { participantId: string | null; score: number }[];
}
export interface SyncedMatchInput extends MatchFields {
  pandascoreId: number;
  previousMatches?: { type: "winner" | "loser"; matchPandascoreId: number }[];
  officialStreams?: OfficialMatchStream[];
}
export interface UpdateMatchInput {
  beginAt?: Date | null;
  endAt?: Date | null;
  status?: string;
  results?: { participantId: string; score: number }[];
}
export interface TournamentListOptions {
  limit: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
  redistributableOnly?: boolean;
}
