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

const unused = async (): Promise<never> => await Promise.reject(new Error("unused"));

/** Complete roster ports whose every method rejects, for collaborators a test never reaches. */
export const unusedPlayerQueries: PlayerQueries = {
  search: unused,
  searchAndCount: unused,
  findById: unused,
  findBySlug: unused,
  getRandomPlayer: unused,
  nationalities: unused,
  findByNationality: unused,
};

export const unusedTeamQueries: TeamQueries = {
  search: unused,
  searchAndCount: unused,
  findById: unused,
  findBySlug: unused,
};

export const unusedContractQueries: ContractQueries = {
  findByPlayer: unused,
  findPastContractsByPlayer: unused,
  findByTeam: unused,
  findFormerPlayersByTeam: unused,
  findMovements: unused,
  findMovementsOnDay: unused,
};

export const unusedPhotoQueries: PhotoQueries = { findByPlayer: unused };

export const unusedPlayerWriter: PlayerWriter = {
  findById: unused,
  findBySlug: unused,
  save: unused,
  delete: unused,
};

export const unusedTeamWriter: TeamWriter = {
  findById: unused,
  findBySlug: unused,
  redirectCount: unused,
  save: unused,
  delete: unused,
};

export const unusedContractWriter: ContractWriter = {
  findById: unused,
  findByPlayer: unused,
  findByTeam: unused,
  save: unused,
  delete: unused,
};

export const unusedPhotoWriter: PhotoWriter = {
  findById: unused,
  findByPlayer: unused,
  save: unused,
  delete: unused,
};
