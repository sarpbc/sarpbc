import { Contract, ContractRole, Player } from "../player.entities";

export const CONTRACT_REPOSITORY = Symbol("CONTRACT_REPOSITORY");

export interface IContractRepository {
  findByPlayer(playerId: string): Promise<Contract[]>;
  findPastContractsByPlayer(playerId: string): Promise<Contract[]>;
  findByTeam(teamId: string): Promise<Contract[]>;
  findFormerPlayersByTeam(teamId: string): Promise<Contract[]>;
  findById(id: string): Promise<Contract | null>;
  save(contract: Contract): Promise<void>;
  delete(contract: Contract): Promise<void>;
  findActiveContract(playerId: string): Promise<Contract | null>;
}

export interface CreateContractProps {
  player: Player;
  teamId: string;
  startDate: Date;
  endDate?: Date;
  role?: ContractRole;
}
