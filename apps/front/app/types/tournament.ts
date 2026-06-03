import type { League } from "./league";
import type { Match } from "./matches";
import type { Player } from "./player";
import type { Team } from "./team";

export interface DrawnBracketMatch {
  matchId: string;
  teamA?: Team;
  teamB?: Team;
  previousMatchA?: DrawnBracketMatch | string;
  previousMatchB?: DrawnBracketMatch | string;
}

export interface BracketLink {
  match: string;
  previousMatch: string;
  type: "winner" | "loser";
}

export interface Tournament {
  id: string;
  pandascoreId?: number;
  name: string;
  description?: string;
  slug?: string;
  serie?: string;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  winnerId?: string;
  prizepool?: string;
  imageUrl?: string;
  league?: League;
  createdAt: Date;
  updatedAt: Date;
  matches?: Match[];
  participants?: TournamentParticipant[];
  type?: string;
}

export interface TournamentParticipant {
  id: string;
  tournament: Tournament;
  team: Team;
  players?: Player[];
  createdAt: Date;
  updatedAt: Date;
}
