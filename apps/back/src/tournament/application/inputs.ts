import type { OfficialMatchStream } from "../domain/official-match-stream";
export interface ManualTournamentFields {
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
export interface UpdateTournamentInput extends ManualTournamentFields {
  name?: string;
}
export interface UpsertMatchInput {
  name: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  numberOfGames?: number;
  participantIds: string[];
  pandascoreId?: number;
  previous_matches?: { type: "winner" | "loser"; match_id: number }[];
  results?: { participantId: string | null; score: number }[];
  officialStreams?: OfficialMatchStream[];
}
export interface UpdateMatchInput {
  beginAt?: Date | null;
  endAt?: Date | null;
  status?: string;
  results?: { participantId: string; score: number }[];
}
export interface TournamentListOptions {
  limit?: number;
  offset?: number;
  pickems?: boolean;
  activeOnly?: boolean;
  redistributableOnly?: boolean;
}
