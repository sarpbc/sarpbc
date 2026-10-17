import type { RosterTransaction } from "../../player/application/ports/roster-transaction";
import { NotFoundError } from "../../common/domain/errors";
import { CreateTeamInput, UpdateTeamInput } from "./inputs";
import { PlayerService } from "../../player/application/player.service";
import { Team } from "../../player/domain/roster";
import { TeamSearchProps } from "./search-team-props";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";

import { ITeamRepository } from "./ports/team.repository.interface";

export class TeamService {
  constructor(
    private readonly teamRepository: ITeamRepository,
    private readonly transaction: RosterTransaction,
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

  async create(dto: CreateTeamInput): Promise<Team> {
    const team = new Team();
    team.name = dto.name;
    team.location = dto.location ?? null;
    team.imageUrl = dto.imageUrl ?? null;
    team.darkModeImageUrl = dto.darkModeImageUrl ?? null;
    team.slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-");

    await this.teamRepository.save(team);
    return team;
  }

  async update(id: string, dto: UpdateTeamInput): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError(`Team with id "${id}" not found`);
    }

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.location !== undefined) team.location = dto.location;
    if (dto.imageUrl !== undefined) team.imageUrl = dto.imageUrl;
    if (dto.darkModeImageUrl !== undefined) team.darkModeImageUrl = dto.darkModeImageUrl;
    if (dto.slug !== undefined) team.slug = dto.slug;

    await this.teamRepository.save(team);
    return team;
  }

  async delete(id: string): Promise<void> {
    return this.transaction.run(async ({ teams, players, contracts }) => {
      const team = await teams.findWithPlayers(id);
      if (!team) throw new NotFoundError(`Team with id "${id}" not found`);
      for (const contract of await contracts.findByTeam(id)) await contracts.delete(contract);
      for (const player of team.players) {
        player.team = null;
        await players.save(player);
      }
      await teams.delete(team);
    });
  }

  async addPlayerToTeam(teamId: string, playerId: string): Promise<Team | null> {
    const team = await this.teamRepository.findById(teamId);
    if (!team) return null;

    const player = await this.playerService.findById(playerId);
    if (!player) return null;

    player.team = team;
    await this.playerService.assignToTeam(playerId, teamId);
    return this.teamRepository.findWithPlayers(teamId);
  }

  async initializeTeamsFromPandaScore(cancelIfExistingTeam: boolean): Promise<void> {
    await this.syncPandascoreTeamsUseCase.execute(cancelIfExistingTeam);
  }
}
