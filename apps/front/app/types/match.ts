import type { Tournament, TournamentParticipant } from "./tournament";

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
  results?: unknown[];
  createdAt: Date;
  updatedAt: Date;
  tournament: Tournament;
}
