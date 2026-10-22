import type { TournamentEventRef } from "@sarpbc/types";
import type { League } from "./league";
import type { Match } from "./matches";
import type { Player } from "./player";
import type { Team } from "./team";

export interface BracketLink {
  match: string | { id: string };
  previousMatch: string | { id: string };
  type: "winner" | "loser";
}

export interface Tournament {
  id: string;
  pandascoreId?: number;
  name: string;
  description?: string;
  /** Stage slug, unique within its event. */
  slug: string;
  event: TournamentEventRef;
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
  team: Team;
  players?: Player[];
  createdAt: Date;
  updatedAt: Date;
}

export type TournamentTab = "overview" | "matches";

/** One PandaScore serie or manual tournament. Its stages are `Tournament`s, newest first. */
export interface TournamentEvent {
  id: string;
  slug: string;
  name: string;
  league: League | null;
  logoUrl: string | null;
  prizepool: string | null;
  type: string | null;
  beginAt: string | null;
  endAt: string | null;
  /** List responses omit `matches`; the event detail embeds them for the brackets. */
  stages: Tournament[];
}

export type TournamentPathResponse =
  | { kind: "event"; event: TournamentEvent }
  | { kind: "stage"; tournament: Tournament; tab: TournamentTab };
