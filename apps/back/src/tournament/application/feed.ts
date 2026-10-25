import type {
  ImportedPlayer,
  UpsertPlayerCommand,
  UpsertTeamCommand,
} from "../../roster/application/imports";
import type { OfficialMatchStream } from "../domain/official-match-stream";

export interface UpsertLeagueCommand {
  pandascoreId: number;
  name: string;
  slug?: string;
  url?: string | null;
  imageUrl?: string;
  modifiedAt?: Date;
}

export interface UpsertSerieCommand {
  pandascoreId: number;
  fullName?: string;
  year?: number;
}

export interface UpsertTournamentParticipantCommand {
  team: UpsertTeamCommand;
  players: UpsertPlayerCommand[];
}

export interface UpsertTournamentCommand {
  pandascoreId: number;
  name: string;
  serie?: UpsertSerieCommand;
  tier?: string;
  beginAt?: Date;
  endAt?: Date;
  prizepool?: string;
  type?: string;
  country?: string;
  hasBracket?: boolean;
  winnerType?: string;
  winnerPandascoreTeamId?: number | null;
  league?: UpsertLeagueCommand;
  expectedRoster?: UpsertTournamentParticipantCommand[];
}

export interface UpsertMatchResultCommand {
  teamPandascoreId: number;
  score: number;
}

export interface UpsertMatchPreviousMatchCommand {
  type: "winner" | "loser";
  matchPandascoreId: number;
}

export interface UpsertMatchCommand {
  pandascoreId: number;
  tournamentPandascoreId: number;
  name: string;
  beginAt?: Date;
  endAt?: Date;
  status?: string;
  numberOfGames?: number;
  opponentSlugs: string[];
  opponentPandascoreIds?: number[];
  results: UpsertMatchResultCommand[];
  previousMatches: UpsertMatchPreviousMatchCommand[];
  officialStreams: OfficialMatchStream[];
}

export type IncidentKind = "league" | "match" | "player" | "serie" | "team" | "tournament";

type IncidentChange =
  | { kind: "tournament"; command: UpsertTournamentCommand }
  | { kind: "match"; command: UpsertMatchCommand }
  | { kind: "team"; command: UpsertTeamCommand }
  | { kind: "player"; command: ImportedPlayer }
  | { kind: "league"; command: UpsertLeagueCommand }
  | { kind: "serie"; command: UpsertSerieCommand };

export type ProviderDeletion =
  | { kind: "merged"; intoId: number }
  | { kind: "replaced"; entity: "serie" | "tournament"; byId: number }
  | { kind: "deleted" };

export type CompetitionIncident = { id: number; modifiedAt: Date } & (
  | { changeType: "deletion"; kind: IncidentKind; deletion: ProviderDeletion }
  | ({ changeType: "creation" | "update" } & IncidentChange)
);

export interface ListIncidentsParams {
  since?: Date;
  type?: IncidentKind[];
  videogame?: string[];
  page?: number;
  perPage?: number;
  sort?: "modified_at" | "-modified_at" | "id" | "-id";
}

export interface CompetitionFeed {
  listIncidents(params?: ListIncidentsParams): Promise<CompetitionIncident[]>;
  getTournaments(): Promise<UpsertTournamentCommand[]>;
  getTournamentById(id: number): Promise<UpsertTournamentCommand | null>;
  getTournamentBrackets(id: number): Promise<UpsertMatchCommand[]>;
  getTournamentMatches(id: number): Promise<UpsertMatchCommand[]>;
}
