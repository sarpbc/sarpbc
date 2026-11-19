import type {
  ContractQueries,
  ContractWriter,
  PhotoQueries,
  PhotoWriter,
  PlayerQueries,
  PlayerWriter,
  TeamQueries,
  TeamWriter,
} from "../src/roster/application/ports";

const unused = async () => await Promise.reject(new Error("unused"));

export const unusedPlayerQueries: PlayerQueries = {
  bornOnDay: unused,
  findById: unused,
  findByNationality: unused,
  findBySlug: unused,
  getRandomPlayer: unused,
  nationalities: unused,
  search: unused,
  searchAndCount: unused,
};

export const unusedTeamQueries: TeamQueries = {
  findById: unused,
  findBySlug: unused,
  search: unused,
  searchAndCount: unused,
};

export const unusedContractQueries: ContractQueries = {
  findByPlayer: unused,
  findByTeam: unused,
  findFormerPlayersByTeam: unused,
  findMovements: unused,
  findMovementsOnDay: unused,
  findPastContractsByPlayer: unused,
};

export const unusedPhotoQueries: PhotoQueries = { findByPlayer: unused };

export const unusedPlayerWriter: PlayerWriter = {
  delete: unused,
  findById: unused,
  findBySlug: unused,
  save: unused,
};

export const unusedTeamWriter: TeamWriter = {
  delete: unused,
  findById: unused,
  findBySlug: unused,
  redirectCount: unused,
  save: unused,
};

export const unusedContractWriter: ContractWriter = {
  delete: unused,
  findById: unused,
  findByPlayer: unused,
  findByTeam: unused,
  save: unused,
};

export const unusedPhotoWriter: PhotoWriter = {
  delete: unused,
  findById: unused,
  findByPlayer: unused,
  save: unused,
};
