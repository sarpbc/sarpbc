import { v4 } from "uuid";
import type { Player, Team } from "../../player/domain/roster";
import type { OfficialMatchStream } from "./official-match-stream";
import type { TournamentSource } from "./tournament-source";
export class League {
  id = v4();
  pandascoreId!: number;
  name = "";
  slug: string | null = null;
  url: string | null = null;
  imageUrl: string | null = null;
  modifiedAt: Date | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}
export class TournamentParticipant {
  id = v4();
  tournamentId = "";
  team!: Team;
  players: Player[] = [];
  createdAt = new Date();
  updatedAt = new Date();
}
export interface BracketLink {
  id: string;
  match: { id: string };
  previousMatch: { id: string };
  type: "winner" | "loser";
}
export interface MatchResult {
  id: string;
  match: { id: string };
  participant: { id: string };
  score: number;
}
export interface TournamentSummary {
  id: string;
  name: string;
  serie: string | null;
  league: League | null;
  pickemsEnabled: boolean;
  source: TournamentSource;
  pandascoreId: number | null;
}
export class Match {
  id = v4();
  pandascoreId: number | null = null;
  name = "";
  slug: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  status: string | null = null;
  participants: TournamentParticipant[] = [];
  winner: TournamentParticipant | null = null;
  numberOfGames: number | null = null;
  previousMatches: BracketLink[] = [];
  results: MatchResult[] = [];
  officialStreams: OfficialMatchStream[] = [];
  createdAt = new Date();
  updatedAt = new Date();
  tournament!: TournamentSummary;
}
export class Tournament {
  id = v4();
  pandascoreId: number | null = null;
  source: TournamentSource = "pandascore";
  name = "";
  description: string | null = null;
  slug: string | null = null;
  serie: string | null = null;
  tier: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  winner: TournamentParticipant | null = null;
  winnerType: string | null = null;
  type: string | null = null;
  country: string | null = null;
  prizepool: string | null = null;
  imageUrl: string | null = null;
  league: League | null = null;
  pickemsEnabled = false;
  hasBracket = false;
  createdAt = new Date();
  updatedAt = new Date();
  matches: Match[] = [];
  participants: TournamentParticipant[] = [];
}
export interface ParticipantSnapshot {
  id: string;
  tournamentId: string;
  teamId: string;
  playerIds: string[];
}
export interface ParticipantReferences {
  tournamentWinner: boolean;
  matchParticipant: boolean;
  matchWinner: boolean;
  results: boolean;
}
