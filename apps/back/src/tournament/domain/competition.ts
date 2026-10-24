import { v4 } from "uuid";
import { matchSlug } from "@sarpbc/utils";
import type { TournamentEventRef } from "@sarpbc/types";
import type { Player, Team } from "../../player/domain/roster";
import type { OfficialMatchStream } from "./official-match-stream";
import type { DataSource } from "../../common/domain/data-source";
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
  slug: string;
  event: TournamentEventRef;
  beginAt: Date | null;
  league: League | null;
  pickemsEnabled: boolean;
  source: DataSource;
  pandascoreId: number | null;
}
export class Match {
  id = v4();
  publicId!: number;
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  name = "";
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
export interface MatchSlugSource {
  name: string;
  participants: ReadonlyArray<{ team: { name: string } }>;
  tournament: { slug: string; event: { slug: string } };
}
export function matchPublicSlug({ name, participants, tournament }: MatchSlugSource): string {
  return matchSlug({
    teamNames: [participants[0]?.team.name, participants[1]?.team.name],
    matchName: name,
    eventSlug: tournament.event.slug,
    stageSlug: tournament.slug,
  });
}
export class Tournament {
  id = v4();
  pandascoreId: number | null = null;
  source: DataSource = "pandascore";
  name = "";
  description: string | null = null;
  /** Stage slug, unique within its event and frozen once allocated. */
  slug = "";
  event!: TournamentEventRef;
  tier: string | null = null;
  beginAt: Date | null = null;
  endAt: Date | null = null;
  /** Staff fixed the end date; PandaScore sync leaves it alone. */
  endAtCorrected = false;
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
