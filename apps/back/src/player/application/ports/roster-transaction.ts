import type { IPlayerRepository } from "./player.repository.interface";
import type { IPlayerPhotoRepository } from "./player-photo.repository.interface";
import type { IContractRepository } from "./contract.repository.interface";
import type { ITeamRepository } from "../../../team/application/ports/team.repository.interface";
export interface RosterStores {
  players: IPlayerRepository;
  photos: IPlayerPhotoRepository;
  contracts: IContractRepository;
  teams: ITeamRepository;
}
export interface RosterTransaction {
  run<T>(work: (stores: RosterStores) => Promise<T>): Promise<T>;
}
