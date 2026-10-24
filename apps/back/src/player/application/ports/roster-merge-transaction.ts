import type { RosterStores } from "./roster-transaction";

/** Rows owned by other features that point at a player or team. */
export interface RosterReferences {
  movePlayer(fromId: string, toId: string): Promise<void>;
  moveTeam(fromId: string, toId: string): Promise<void>;
  sharedTournamentIds(teamId: string, otherTeamId: string): Promise<string[]>;
}

export interface RosterMergeStores extends RosterStores {
  references: RosterReferences;
}

export interface RosterMergeTransaction {
  run<T>(work: (stores: RosterMergeStores) => Promise<T>): Promise<T>;
}
