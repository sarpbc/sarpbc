import type { Contract, Player, PlayerPhoto, Team } from "../domain/roster";
import type { TeamLogoFormat } from "../domain/team-logo";
import type { ImportedPlayer } from "./imports";
import type { ContractMovementFilter, DirectorySearchProps } from "./search-props";
export interface PlayerQueries {
  search(options: Partial<DirectorySearchProps>): Promise<Player[]>;
  searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Player[], number]>;
  findById(id: string): Promise<Player | null>;
  findBySlug(slug: string): Promise<Player | null>;
  getRandomPlayer(): Promise<Player | null>;
}
export interface TeamQueries {
  search(options: Partial<DirectorySearchProps>): Promise<Team[]>;
  searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Team[], number]>;
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
}
export interface ContractQueries {
  findByPlayer(playerId: string): Promise<Contract[]>;
  findPastContractsByPlayer(playerId: string): Promise<Contract[]>;
  findByTeam(teamId: string): Promise<Contract[]>;
  findFormerPlayersByTeam(teamId: string): Promise<Contract[]>;
  findMovements(filter: ContractMovementFilter): Promise<Contract[]>;
}
export interface PhotoQueries {
  findByPlayer(playerId: string): Promise<PlayerPhoto[]>;
}
export interface PlayerWriter extends Pick<PlayerQueries, "findById" | "findBySlug"> {
  save(player: Player): Promise<void>;
  delete(player: Player): Promise<void>;
}
export interface TeamWriter extends Pick<TeamQueries, "findById" | "findBySlug"> {
  save(team: Team): Promise<void>;
  delete(team: Team): Promise<void>;
}
export interface ContractWriter extends Pick<ContractQueries, "findByPlayer" | "findByTeam"> {
  findById(id: string): Promise<Contract | null>;
  save(contract: Contract): Promise<void>;
  delete(contract: Contract): Promise<void>;
}
export interface PhotoWriter extends PhotoQueries {
  findById(id: string): Promise<PlayerPhoto | null>;
  save(photo: PlayerPhoto): Promise<void>;
  delete(photo: PlayerPhoto): Promise<void>;
}
export interface RosterWriteScope {
  players: PlayerWriter;
  teams: TeamWriter;
  contracts: ContractWriter;
  photos: PhotoWriter;
}
export interface RosterTransaction {
  run<T>(work: (scope: RosterWriteScope) => Promise<T>): Promise<T>;
}
/** Roster owns the merge; every table that references a player or team implements this for its rows. */
export interface RosterReferenceMover {
  movePlayer(fromId: string, toId: string): Promise<void>;
  moveTeam(fromId: string, toId: string): Promise<void>;
  sharedTournamentIds(teamId: string, otherTeamId: string): Promise<string[]>;
}
export interface RosterMergeWriteScope extends RosterWriteScope {
  references: RosterReferenceMover;
}
export interface RosterMergeTransaction {
  run<T>(work: (scope: RosterMergeWriteScope) => Promise<T>): Promise<T>;
}
export interface CurrentRosterSource {
  load(): Promise<ImportedPlayer[]>;
}
export interface CurrentRosterWriter {
  hasTeams(): Promise<boolean>;
  syncCurrentTeams(roster: ImportedPlayer[]): Promise<void>;
}

export interface TeamLogoSource {
  download(url: URL, maxBytes: number): Promise<Uint8Array>;
}

export interface TeamLogoImages {
  dimensions(bytes: Uint8Array): Promise<{ width: number; height: number }>;
  normalize(bytes: Uint8Array, format: TeamLogoFormat, pixels: number): Promise<Uint8Array>;
}

export interface StoredTeamLogo {
  key: string;
  url: string;
}

export interface TeamLogoStorage {
  put(key: string, bytes: Uint8Array, contentType: "image/webp"): Promise<StoredTeamLogo>;
  copy(sourceKey: string, key: string): Promise<StoredTeamLogo>;
  delete(key: string): Promise<void>;
}
