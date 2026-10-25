import { NotFoundError, UnprocessableError } from "../../common/domain/errors";
import {
  CreateContractInput,
  CreateTeamContractInput,
  SourcedContractInput,
  SourcedContractUpdate,
  UpdateContractInput,
  UpdateTeamContractInput,
} from "./inputs";
import { Contract, ContractRole } from "../domain/roster";
import type { ContractQueries, RosterTransaction, RosterWriteScope, TeamQueries } from "./ports";

export class ContractService {
  constructor(
    private readonly contracts: ContractQueries,
    private readonly teams: TeamQueries,
    private readonly transaction: RosterTransaction,
  ) {}

  async getContractsByPlayer(playerId: string): Promise<Contract[]> {
    return this.contracts.findByPlayer(playerId);
  }

  async getOldTeamsByPlayer(playerId: string): Promise<Contract[]> {
    return this.contracts.findPastContractsByPlayer(playerId);
  }

  async getFormerPlayersByTeam(teamId: string): Promise<Contract[]> {
    return this.contracts.findFormerPlayersByTeam(teamId);
  }

  async getContractsByTeam(teamId: string): Promise<Contract[]> {
    const team = await this.teams.findById(teamId);
    if (!team) {
      throw new NotFoundError(`Team with id "${teamId}" not found`);
    }
    return this.contracts.findByTeam(teamId);
  }

  async createForTeam(teamId: string, dto: CreateTeamContractInput): Promise<Contract> {
    return this.create(dto.playerId, {
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
    return this.transaction.run(async (scope) => {
      const contract = await scope.contracts.findById(contractId);
      if (!contract || contract.team.id !== teamId) {
        throw new NotFoundError(`Contract with id "${contractId}" not found`);
      }

      const updateDto: UpdateContractInput = {};
      if (dto.startDate !== undefined) updateDto.startDate = dto.startDate;
      if (dto.endDate !== undefined) updateDto.endDate = dto.endDate ?? undefined;
      if (dto.role !== undefined) updateDto.role = dto.role;

      return this.applyUpdate(scope, contract.player.id, contractId, updateDto);
    });
  }

  async deleteForTeam(teamId: string, contractId: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      const contract = await scope.contracts.findById(contractId);
      if (!contract || contract.team.id !== teamId) {
        throw new NotFoundError(`Contract with id "${contractId}" not found`);
      }
      await this.remove(scope, contract.player.id, contractId);
    });
  }

  async create(playerId: string, dto: CreateContractInput): Promise<Contract> {
    return this.transaction.run(async (scope) => {
      const contract = await this.build(scope, playerId, dto);
      await scope.contracts.save(contract);
      return contract;
    });
  }

  async recordPeriod(
    playerId: string,
    { sourceUrl, ...dto }: SourcedContractInput,
  ): Promise<Contract> {
    return this.transaction.run(async (scope) => {
      const contract = await this.build(scope, playerId, dto);
      contract.joinSourceUrl = sourceUrl;
      if (contract.endDate) contract.leaveSourceUrl = sourceUrl;
      await this.saveInCareer(scope, contract);
      return contract;
    });
  }

  async update(playerId: string, contractId: string, dto: UpdateContractInput): Promise<Contract> {
    return this.transaction.run((scope) => this.applyUpdate(scope, playerId, contractId, dto));
  }

  async revisePeriod(
    playerId: string,
    contractId: string,
    { sourceUrl, ...dto }: SourcedContractUpdate,
  ): Promise<Contract> {
    return this.transaction.run(async (scope) => {
      const contract = await this.edit(scope, playerId, contractId, dto);
      if (dto.teamId !== undefined || dto.startDate !== undefined) {
        contract.joinSourceUrl = sourceUrl;
      }
      if (dto.endDate !== undefined) {
        contract.leaveSourceUrl = dto.endDate ? sourceUrl : null;
      }
      await this.saveInCareer(scope, contract);
      return contract;
    });
  }

  async delete(playerId: string, contractId: string): Promise<void> {
    return this.transaction.run((scope) => this.remove(scope, playerId, contractId));
  }

  private async applyUpdate(
    scope: RosterWriteScope,
    playerId: string,
    contractId: string,
    dto: UpdateContractInput,
  ): Promise<Contract> {
    const contract = await this.edit(scope, playerId, contractId, dto);
    await scope.contracts.save(contract);
    return contract;
  }

  private async remove(
    { contracts }: RosterWriteScope,
    playerId: string,
    contractId: string,
  ): Promise<void> {
    const contract = await contracts.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }
    await contracts.delete(contract);
  }

  private async build(
    { players, teams }: RosterWriteScope,
    playerId: string,
    dto: CreateContractInput,
  ): Promise<Contract> {
    const player = await players.findById(playerId);
    if (!player) {
      throw new NotFoundError(`Player with id "${playerId}" not found`);
    }

    const team = await teams.findById(dto.teamId);
    if (!team) {
      throw new UnprocessableError(`Team with id "${dto.teamId}" not found`);
    }

    const contract = new Contract();
    contract.player = player;
    contract.team = team;
    contract.startDate = new Date(dto.startDate);
    contract.endDate = dto.endDate ? new Date(dto.endDate) : null;
    contract.role = dto.role ?? ContractRole.ACTIVE;
    return contract;
  }

  private async edit(
    { contracts, teams }: RosterWriteScope,
    playerId: string,
    contractId: string,
    dto: UpdateContractInput,
  ): Promise<Contract> {
    const contract = await contracts.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }

    if (dto.teamId) {
      const team = await teams.findById(dto.teamId);
      if (!team) {
        throw new UnprocessableError(`Team with id "${dto.teamId}" not found`);
      }
      contract.team = team;
    }

    if (dto.startDate !== undefined) {
      contract.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      contract.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    if (dto.role !== undefined) {
      contract.role = dto.role;
    }
    return contract;
  }

  private async saveInCareer(
    { players, contracts }: RosterWriteScope,
    contract: Contract,
  ): Promise<void> {
    const player = await players.findById(contract.player.id);
    const career = await contracts.findByPlayer(contract.player.id);
    contract.assertFitsCareer(career, player?.team?.id ?? null);
    await contracts.save(contract);
  }
}
