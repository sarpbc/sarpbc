import type { ImportedPlayerProfile, ImportedTeamProfile } from "../domain/imported-profile";

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
