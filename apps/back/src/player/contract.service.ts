import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ContractRepository } from "./contract.repository";
import { PlayerRepository } from "./player.repository";
import { TeamService } from "../team/team.service";
import { Contract, ContractRole } from "./domain/contract.entity";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { CreateTeamContractDto } from "../team/dto/create-team-contract.dto";
import { UpdateTeamContractDto } from "../team/dto/update-team-contract.dto";

@Injectable()
export class ContractService {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly playerRepository: PlayerRepository,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
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
    const team = await this.teamService.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Team with id "${teamId}" not found`);
    }
    return this.contractRepository.findByTeam(teamId);
  }

  async createForTeam(teamId: string, dto: CreateTeamContractDto): Promise<Contract> {
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
    dto: UpdateTeamContractDto,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.team.id !== teamId) {
      throw new NotFoundException(`Contract with id "${contractId}" not found`);
    }

    const updateDto: UpdateContractDto = {};
    if (dto.startDate !== undefined) updateDto.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateDto.endDate = dto.endDate ?? undefined;
    if (dto.role !== undefined) updateDto.role = dto.role;

    return this.update(contract.player.id, contractId, updateDto);
  }

  async deleteForTeam(teamId: string, contractId: string): Promise<void> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.team.id !== teamId) {
      throw new NotFoundException(`Contract with id "${contractId}" not found`);
    }
    await this.delete(contract.player.id, contractId);
  }

  async create(playerId: string, dto: CreateContractDto): Promise<Contract> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundException(`Player with id "${playerId}" not found`);
    }

    const team = await this.teamService.findById(dto.teamId);
    if (!team) {
      throw new UnprocessableEntityException(`Team with id "${dto.teamId}" not found`);
    }

    const contract = new Contract();
    contract.player = player;
    contract.team = team;
    contract.startDate = new Date(dto.startDate);
    contract.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    contract.role = dto.role ?? ContractRole.ACTIVE;

    await this.contractRepository.save(contract);
    return contract;
  }

  async update(playerId: string, contractId: string, dto: UpdateContractDto): Promise<Contract> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundException(`Contract with id "${contractId}" not found`);
    }

    if (dto.teamId) {
      const team = await this.teamService.findById(dto.teamId);
      if (!team) {
        throw new UnprocessableEntityException(`Team with id "${dto.teamId}" not found`);
      }
      contract.team = team;
    }

    if (dto.startDate !== undefined) {
      contract.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      contract.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    }

    if (dto.role !== undefined) {
      contract.role = dto.role;
    }

    await this.contractRepository.save(contract);
    return contract;
  }

  async delete(playerId: string, contractId: string): Promise<void> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract || contract.player.id !== playerId) {
      throw new NotFoundException(`Contract with id "${contractId}" not found`);
    }
    await this.contractRepository.delete(contract);
  }
}
