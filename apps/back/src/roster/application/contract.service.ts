import { isStaffContractRole } from "@sarpbc/utils";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import {
  CreateContractInput,
  CreateTeamContractInput,
  SourcedContractInput,
  SourcedContractUpdate,
  UpdateContractInput,
  UpdateTeamContractInput,
} from "./inputs";
import { Contract } from "../domain/contract";
import type { ContractQueries, RosterTransaction, RosterWriteScope, TeamQueries } from "./ports";
import { requireTeam } from "./require-team";

const removeContract = async (
  { contracts }: RosterWriteScope,
  playerId: string,
  contractId: string,
): Promise<void> => {
  const contract = await contracts.findById(contractId);

  if (!contract || contract.player.id !== playerId) {
    throw new NotFoundError(`Contract with id "${contractId}" not found`);
  }

  await contracts.delete(contract);
};

const buildContract = async (
  { players, teams }: RosterWriteScope,
  playerId: string,
  dto: CreateContractInput,
): Promise<Contract> => {
  const player = await players.findById(playerId);

  if (!player) {
    throw new NotFoundError(`Player with id "${playerId}" not found`);
  }

  const contract = new Contract();
  contract.player = player;
  contract.team = await requireTeam(teams, dto.teamId);
  contract.startDate = new Date(dto.startDate);
  contract.endDate = dto.endDate !== undefined && dto.endDate !== "" ? new Date(dto.endDate) : null;
  contract.role = dto.role ?? "active";

  return contract;
};

const editContract = async (
  { contracts, teams }: RosterWriteScope,
  playerId: string,
  contractId: string,
  dto: UpdateContractInput,
): Promise<Contract> => {
  const contract = await contracts.findById(contractId);

  if (!contract || contract.player.id !== playerId) {
    throw new NotFoundError(`Contract with id "${contractId}" not found`);
  }

  if (dto.teamId !== undefined && dto.teamId !== "") {
    contract.team = await requireTeam(teams, dto.teamId);
  }

  if (dto.startDate !== undefined) {
    contract.startDate = new Date(dto.startDate);
  }

  if (dto.endDate !== undefined) {
    contract.endDate = dto.endDate !== null && dto.endDate !== "" ? new Date(dto.endDate) : null;
  }

  if (dto.role !== undefined) {
    contract.role = dto.role;
  }

  return contract;
};

const saveContractInCareer = async (
  { players, contracts }: RosterWriteScope,
  contract: Contract,
): Promise<void> => {
  const player = await players.findById(contract.player.id);
  const career = await contracts.findByPlayer(contract.player.id);
  contract.assertFitsCareer(career, player?.team?.id ?? null);
  await contracts.save(contract);
};

const applyContractUpdate = async (
  scope: RosterWriteScope,
  playerId: string,
  contractId: string,
  dto: UpdateContractInput,
): Promise<Contract> => {
  const contract = await editContract(scope, playerId, contractId, dto);
  await saveContractInCareer(scope, contract);

  return contract;
};

export class ContractService {
  constructor(
    private readonly contracts: ContractQueries,
    private readonly teams: TeamQueries,
    private readonly transaction: RosterTransaction,
  ) {}

  async getContractsByPlayer(playerId: string): Promise<Contract[]> {
    return await this.contracts.findByPlayer(playerId);
  }

  async getStaffContractsByPlayer(playerId: string): Promise<Contract[]> {
    const contracts = await this.contracts.findByPlayer(playerId);

    return contracts.filter((contract) => isStaffContractRole(contract.role));
  }

  async getOldTeamsByPlayer(playerId: string): Promise<Contract[]> {
    return await this.contracts.findPastContractsByPlayer(playerId);
  }

  async getFormerPlayersByTeam(teamId: string): Promise<Contract[]> {
    return await this.contracts.findFormerPlayersByTeam(teamId);
  }

  async getContractsByTeam(teamId: string): Promise<Contract[]> {
    const team = await this.teams.findById(teamId);

    if (!team) {
      throw new NotFoundError(`Team with id "${teamId}" not found`);
    }

    return await this.contracts.findByTeam(teamId);
  }

  async createForTeam(teamId: string, dto: CreateTeamContractInput): Promise<Contract> {
    return await this.create(dto.playerId, {
      teamId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      role: dto.role,
    });
  }

  async updateForTeam(
    teamId: string,
    contractId: string,
    dto: UpdateTeamContractInput,
  ): Promise<Contract> {
    return await this.transaction.run(async (scope) => {
      const contract = await scope.contracts.findById(contractId);

      if (!contract || contract.team.id !== teamId) {
        throw new NotFoundError(`Contract with id "${contractId}" not found`);
      }

      const updateDto: UpdateContractInput = {};

      if (dto.startDate !== undefined) {
        updateDto.startDate = dto.startDate;
      }

      if (dto.endDate !== undefined) {
        updateDto.endDate = dto.endDate ?? undefined;
      }

      if (dto.role !== undefined) {
        updateDto.role = dto.role;
      }

      return await applyContractUpdate(scope, contract.player.id, contractId, updateDto);
    });
  }

  async deleteForTeam(teamId: string, contractId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      const contract = await scope.contracts.findById(contractId);

      if (!contract || contract.team.id !== teamId) {
        throw new NotFoundError(`Contract with id "${contractId}" not found`);
      }

      await removeContract(scope, contract.player.id, contractId);
    });
  }

  async create(playerId: string, dto: CreateContractInput): Promise<Contract> {
    return await this.transaction.run(async (scope) => {
      const contract = await buildContract(scope, playerId, dto);
      await saveContractInCareer(scope, contract);

      return contract;
    });
  }

  async recordPeriod(
    playerId: string,
    { sourceUrl, ...dto }: SourcedContractInput,
  ): Promise<Contract> {
    return await this.transaction.run(async (scope) => {
      const contract = await buildContract(scope, playerId, dto);
      contract.joinSourceUrl = sourceUrl;

      if (contract.endDate) {
        contract.leaveSourceUrl = sourceUrl;
      }

      await saveContractInCareer(scope, contract);

      return contract;
    });
  }

  async update(playerId: string, contractId: string, dto: UpdateContractInput): Promise<Contract> {
    return await this.transaction.run(
      async (scope) => await applyContractUpdate(scope, playerId, contractId, dto),
    );
  }

  async revisePeriod(
    playerId: string,
    contractId: string,
    { sourceUrl, ...dto }: SourcedContractUpdate,
  ): Promise<Contract> {
    return await this.transaction.run(async (scope) => {
      const contract = await editContract(scope, playerId, contractId, dto);

      if (dto.teamId !== undefined || dto.startDate !== undefined) {
        contract.joinSourceUrl = sourceUrl;
      }

      if (dto.endDate !== undefined) {
        contract.leaveSourceUrl = dto.endDate !== null && dto.endDate !== "" ? sourceUrl : null;
      }

      await saveContractInCareer(scope, contract);

      return contract;
    });
  }

  async delete(playerId: string, contractId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      await removeContract(scope, playerId, contractId);
    });
  }
}
