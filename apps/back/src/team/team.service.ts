import { Injectable, Inject, forwardRef, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { PlayerService } from "../player/player.service";
import { Team } from "../player/player.entities";
import { TeamSearchProps } from "./interfaces/search-team-props";
import { SyncPandascoreTeamsUseCase } from "./sync/sync-pandascore-teams.use-case";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { ContractService } from "../player/contract.service";
import { ITeamRepository, TEAM_REPOSITORY } from "./domain/team.repository.interface";

@Injectable()
export class TeamService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    private readonly em: EntityManager,
    @Inject(forwardRef(() => ContractService))
    private readonly contractService: ContractService,
    @Inject(forwardRef(() => PlayerService))
    private readonly playerService: PlayerService,
    private readonly syncPandascoreTeamsUseCase: SyncPandascoreTeamsUseCase,
  ) {}

  async find(options: Partial<TeamSearchProps>): Promise<Team[]> {
    return this.teamRepository.search(options);
  }

  async findAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]> {
    return this.teamRepository.searchAndCount(options);
  }

  async findById(id: string): Promise<Team | null> {
    return this.teamRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.teamRepository.findBySlug(slug);
  }

  async getTeamWithPlayers(id: string): Promise<Team | null> {
    return this.teamRepository.findWithPlayers(id);
  }

  async create(
    nameOrDto: string | CreateTeamDto,
    location?: string,
    imageUrl?: string,
    slug?: string,
    pandascoreId?: number,
  ): Promise<Team> {
    const dto: CreateTeamDto =
      typeof nameOrDto === "string" ? { name: nameOrDto, location, imageUrl, slug } : nameOrDto;

    const team = new Team();
    team.name = dto.name;
    team.location = dto.location ?? null;
    team.imageUrl = dto.imageUrl ?? null;
    team.slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-");
    team.pandascoreId = pandascoreId ?? null;
    await this.teamRepository.save(team);
    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.location !== undefined) team.location = dto.location;
    if (dto.imageUrl !== undefined) team.imageUrl = dto.imageUrl;
    if (dto.slug !== undefined) team.slug = dto.slug;

    await this.teamRepository.save(team);
    return team;
  }

  async delete(id: string): Promise<void> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }

    const contracts = await this.contractService.getContractsByTeam(id);
    for (const contract of contracts) {
      await this.contractService.deleteForTeam(id, contract.id);
    }

    const teamWithPlayers = await this.teamRepository.findWithPlayers(id);
    if (teamWithPlayers) {
      for (const player of teamWithPlayers.players.getItems()) {
        player.team = null;
        await this.em.persist(player);
      }
    }

    await this.teamRepository.delete(team);
  }

  async createFromDto(dto: CreateTeamDto): Promise<Team> {
    return this.create(dto);
  }

  async addPlayerToTeam(teamId: string, playerId: string): Promise<Team | null> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) return null;

    const player = await this.playerService.findById(playerId);
    if (!player) return null;

    player.team = team;
    await this.em.persist(player).flush();
    return this.teamRepository.findWithPlayers(teamId);
  }

  async initializeTeamsFromPandaScore(cancelIfExistingTeam: boolean): Promise<void> {
    await this.syncPandascoreTeamsUseCase.execute(cancelIfExistingTeam);
  }
}
