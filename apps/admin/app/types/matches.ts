import type { Tournament, TournamentParticipant } from "./tournament";

export interface MatchResult {
  participant: string | { id: string };
  score: number;
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
}
