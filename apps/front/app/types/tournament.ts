import type { League } from "./league";
import type { Match, MatchResult } from "./matches";
import type { Player } from "./player";
import type { Team } from "./team";

export interface DrawnBracketMatch {
  matchId: string;
  teamA?: Team;
  teamB?: Team;
  participantAId?: string;
  participantBId?: string;
  results?: MatchResult[];
  previousMatchA?: DrawnBracketMatch | string;
  previousMatchB?: DrawnBracketMatch | string;
}

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
