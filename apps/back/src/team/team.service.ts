import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { TeamRepository } from "./team.repository";
import { EntityManager } from "@mikro-orm/postgresql";
import { PlayerService } from "../player/player.service";
import { Team } from "./domain/team.entity";
import { TeamSearchProps } from "./interfaces/search-team-props";
import { SyncPandascoreTeamsUseCase } from "./sync/sync-pandascore-teams.use-case";

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly em: EntityManager,
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
    name: string,
    location?: string,
    imageUrl?: string,
    slug?: string,
    pandascoreId?: number,
  ): Promise<Team> {
    const team = new Team();
    team.name = name;
    team.location = location ?? undefined;
    team.imageUrl = imageUrl ?? undefined;
    team.slug = slug ?? name.toLowerCase().replace(/\s+/g, "-");
    team.pandascoreId = pandascoreId ?? undefined;
    await this.teamRepository.save(team);
    return team;
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
