import type { ImportedPlayerProfile, ImportedTeamProfile } from "../domain/roster";

export interface UpsertPlayerCommand extends ImportedPlayerProfile {
  slug: string;
}

export interface UpsertTeamCommand extends ImportedTeamProfile {
  slug: string;
}

export interface ImportedPlayer {
  player: UpsertPlayerCommand;
  currentTeam: UpsertTeamCommand | null;
}
