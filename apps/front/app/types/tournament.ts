import type {
  DataSource,
  League,
  Player,
  Team,
  TournamentEventRef,
  TournamentFormat,
} from "@sarpbc/types";
import type { Match } from "./matches";

export interface BracketLink {
  match: string | { id: string };
  previousMatch: string | { id: string };
  type: "winner" | "loser";
}

export interface Tournament {
  id: string;
  source: DataSource;
  pandascoreId?: number;
  source?: DataSource;
  name: string;
  description?: string;
  /** Stage slug, unique within its event. */
  slug: string;
  event: TournamentEventRef;
  format?: TournamentFormat;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  winnerId?: string;
  /** Populated relation or FK id from API serialization */
  winner?: TournamentParticipant | { id: string; team?: Team; players?: Player[] } | string | null;
  prizepool?: string;
  imageUrl?: string;
  league?: League;
  createdAt: Date;
  updatedAt: Date;
  matches?: Match[];
  participants?: TournamentParticipant[];
  type?: string;
  country?: string | null;
  hasBracket?: boolean;
  pickemsEnabled?: boolean;
}

export interface TournamentParticipant {
  id: string;
  tournament: Tournament;
  team: Team | null;
  players?: Player[];
  createdAt: Date;
  updatedAt: Date;
}
