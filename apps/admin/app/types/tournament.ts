import type { League } from "./league";
import type { Match } from "./matches";
import type { Player } from "./player";
import type { Team } from "./team";

export type TournamentSource = "pandascore" | "manual";

export interface Tournament {
  id: string;
  pandascoreId?: number;
  source: TournamentSource;
  name: string;
  description?: string;
  slug?: string;
  serie?: string;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  winnerId?: string;
  winner?: TournamentParticipant | { id: string; team?: Team } | string | null;
  prizepool?: string;
  imageUrl?: string;
  league?: League;
  createdAt: Date;
  updatedAt: Date;
  matches?: Match[];
  participants?: TournamentParticipant[];
  type?: string;
  hasBracket?: boolean;
  pickemsEnabled?: boolean;
}

export interface TournamentParticipant {
  id: string;
  tournament: Tournament;
  team: Team;
  players?: Player[];
  createdAt: Date;
  updatedAt: Date;
}
