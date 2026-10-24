import { NotFoundError, UnprocessableError } from "../../common/domain/errors";
import {
  CreateContractInput,
  SourcedContractInput,
  SourcedContractUpdate,
  UpdateContractInput,
} from "./inputs";
import { CreateTeamContractInput, UpdateTeamContractInput } from "../../team/application/inputs";

import { ITeamRepository } from "../../team/application/ports/team.repository.interface";
import { Contract, ContractRole } from "../domain/roster";

import { IContractRepository } from "./ports/contract.repository.interface";
import { IPlayerRepository } from "./ports/player.repository.interface";

export class ContractService {
  constructor(
    private readonly contractRepository: IContractRepository,
    private readonly playerRepository: IPlayerRepository,
    private readonly teamRepository: ITeamRepository,
  ) {}

  async getContractsByPlayer(playerId: string): Promise<Contract[]> {
    return this.contractRepository.findByPlayer(playerId);
  }

  async getOldTeamsByPlayer(playerId: string): Promise<Contract[]> {
    return this.contractRepository.findPastContractsByPlayer(playerId);
  }

  async getFormerPlayersByTeam(teamId: string): Promise<Contract[]> {
    return this.contractRepository.findFormerPlayersByTeam(teamId);
  }

  async getContractsByTeam(teamId: string): Promise<Contract[]> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new NotFoundError(`Team with id "${teamId}" not found`);
    }
    return this.contractRepository.findByTeam(teamId);
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
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.team.id !== teamId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }

    const updateDto: UpdateContractInput = {};
    if (dto.startDate !== undefined) updateDto.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateDto.endDate = dto.endDate ?? undefined;
    if (dto.role !== undefined) updateDto.role = dto.role;

    return this.update(contract.player.id, contractId, updateDto);
  }

  async deleteForTeam(teamId: string, contractId: string): Promise<void> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.team.id !== teamId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }
    await this.delete(contract.player.id, contractId);
  }

  async create(playerId: string, dto: CreateContractInput): Promise<Contract> {
    const contract = await this.build(playerId, dto);
    await this.contractRepository.save(contract);
    return contract;
  }

  async recordPeriod(
    playerId: string,
    { sourceUrl, ...dto }: SourcedContractInput,
  ): Promise<Contract> {
    const contract = await this.build(playerId, dto);
    contract.joinSourceUrl = sourceUrl;
    if (contract.endDate) contract.leaveSourceUrl = sourceUrl;
    await this.saveInCareer(contract);
    return contract;
  }

  async update(playerId: string, contractId: string, dto: UpdateContractInput): Promise<Contract> {
    const contract = await this.edit(playerId, contractId, dto);
    await this.contractRepository.save(contract);
    return contract;
  }

  async revisePeriod(
    playerId: string,
    contractId: string,
    { sourceUrl, ...dto }: SourcedContractUpdate,
  ): Promise<Contract> {
    const contract = await this.edit(playerId, contractId, dto);
    if (dto.teamId !== undefined || dto.startDate !== undefined) {
      contract.joinSourceUrl = sourceUrl;
    }
    if (dto.endDate !== undefined) {
      contract.leaveSourceUrl = dto.endDate ? sourceUrl : null;
    }
    await this.saveInCareer(contract);
    return contract;
  }

  async delete(playerId: string, contractId: string): Promise<void> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }
    await this.contractRepository.delete(contract);
  }

  private async build(playerId: string, dto: CreateContractInput): Promise<Contract> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(`Player with id "${playerId}" not found`);
    }

    const team = await this.teamRepository.findById(dto.teamId);
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
    playerId: string,
    contractId: string,
    dto: UpdateContractInput,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundError(`Contract with id "${contractId}" not found`);
    }

    if (dto.teamId) {
      const team = await this.teamRepository.findById(dto.teamId);
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

  private async saveInCareer(contract: Contract): Promise<void> {
    const player = await this.playerRepository.findById(contract.player.id);
    const career = await this.contractRepository.findByPlayer(contract.player.id);
    contract.assertFitsCareer(career, player?.team?.id ?? null);
    await this.contractRepository.save(contract);
  }
}
