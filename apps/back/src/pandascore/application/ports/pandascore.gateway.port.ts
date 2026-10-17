import type { CompetitionIncident, ImportedPlayer, IncidentKind } from "../models/competition-feed";
import type { UpsertTournamentCommand } from "../commands/upsert-tournament.command";
import type { UpsertMatchCommand } from "../commands/upsert-match.command";
export interface ListIncidentsParams {
  since?: Date;
  type?: IncidentKind[];
  videogame?: string[];
  page?: number;
  perPage?: number;
  sort?: "modified_at" | "-modified_at" | "id" | "-id";
}
export interface PandascoreGateway {
  listIncidents(params?: ListIncidentsParams): Promise<CompetitionIncident[]>;
  getTournaments(): Promise<UpsertTournamentCommand[]>;
  getTournamentById(id: number): Promise<UpsertTournamentCommand | null>;
  getTournamentBrackets(id: number): Promise<UpsertMatchCommand[]>;
  getTournamentMatches(id: number): Promise<UpsertMatchCommand[]>;
  getRocketLeaguePlayers(): Promise<ImportedPlayer[]>;
}
export const PANDASCORE_GATEWAY = Symbol("PANDASCORE_GATEWAY");
