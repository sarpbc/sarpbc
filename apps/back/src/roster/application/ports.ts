import type { Contract, Player, PlayerPhoto, Team } from "../domain/roster";
import type { ImportedPlayer } from "./imports";
import type { ContractMovementFilter, PlayerSearchProps, TeamSearchProps } from "./search-props";
export interface PlayerQueries {
  search(options: Partial<PlayerSearchProps>): Promise<Player[]>;
  searchAndCount(options: Partial<PlayerSearchProps>): Promise<[Player[], number]>;
  findById(id: string): Promise<Player | null>;
  findBySlug(slug: string): Promise<Player | null>;
  getRandomPlayer(): Promise<Player | null>;
}
export interface TeamQueries {
  search(options: Partial<TeamSearchProps>): Promise<Team[]>;
  searchAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]>;
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
  findWithPlayers(id: string): Promise<Team | null>;
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
export interface PlayerWriter {
  findById(id: string): Promise<Player | null>;
  findBySlug(slug: string): Promise<Player | null>;
  save(player: Player): Promise<void>;
  delete(player: Player): Promise<void>;
}
export interface TeamWriter {
  findById(id: string): Promise<Team | null>;
  findBySlug(slug: string): Promise<Team | null>;
  findWithPlayers(id: string): Promise<Team | null>;
  save(team: Team): Promise<void>;
  delete(team: Team): Promise<void>;
}
export interface ContractWriter {
  findById(id: string): Promise<Contract | null>;
  findByPlayer(playerId: string): Promise<Contract[]>;
  findByTeam(teamId: string): Promise<Contract[]>;
  save(contract: Contract): Promise<void>;
  delete(contract: Contract): Promise<void>;
}
export interface PhotoWriter {
  findById(id: string): Promise<PlayerPhoto | null>;
  findByPlayer(playerId: string): Promise<PlayerPhoto[]>;
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
export interface RosterReferences {
  movePlayer(fromId: string, toId: string): Promise<void>;
  moveTeam(fromId: string, toId: string): Promise<void>;
  sharedTournamentIds(teamId: string, otherTeamId: string): Promise<string[]>;
}
export interface RosterMergeWriteScope extends RosterWriteScope {
  references: RosterReferences;
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
