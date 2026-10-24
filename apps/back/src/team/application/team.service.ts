import type { RosterTransaction } from "../../player/application/ports/roster-transaction";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { CreateTeamInput, UpdateTeamInput } from "./inputs";
import { Team } from "../../player/domain/roster";
import { TeamSearchProps } from "./search-team-props";
import { SyncPandascoreTeamsUseCase } from "./sync-pandascore-teams.use-case";

import { ITeamRepository } from "./ports/team.repository.interface";

export class TeamService {
  constructor(
    private readonly teamRepository: ITeamRepository,
    private readonly transaction: RosterTransaction,
    private readonly syncPandascoreTeamsUseCase: SyncPandascoreTeamsUseCase,
  ) {}

  async find(options: Partial<TeamSearchProps>): Promise<Team[]> {
    return this.teamRepository.search(options);
  }

  async findAndCount(options: Partial<TeamSearchProps>): Promise<[Team[], number]> {
    return this.teamRepository.searchAndCount(options);
  }

  /** A merged duplicate resolves to the team it was merged into. */
  async findById(id: string): Promise<Team | null> {
    return this.resolveMerged(await this.teamRepository.findById(id));
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.resolveMerged(await this.teamRepository.findBySlug(slug));
  }

  async getTeamWithPlayers(id: string): Promise<Team | null> {
    return this.resolveMerged(await this.teamRepository.findWithPlayers(id));
  }

  private async resolveMerged(team: Team | null): Promise<Team | null> {
    return team?.mergedIntoId ? this.teamRepository.findWithPlayers(team.mergedIntoId) : team;
  }

  async create(dto: CreateTeamInput): Promise<Team> {
    const team = new Team();
    team.name = dto.name;
    team.location = dto.location ?? null;
    team.imageUrl = dto.imageUrl ?? null;
    team.darkModeImageUrl = dto.darkModeImageUrl ?? null;
    team.slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-");
    if (dto.source !== undefined) team.source = dto.source;

    if (await this.teamRepository.findBySlug(team.slug)) {
      throw new ConflictError(`A team with slug "${team.slug}" already exists`);
    }

    await this.teamRepository.save(team);
    return team;
  }

  async update(id: string, dto: UpdateTeamInput): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError(`Team with id "${id}" not found`);
    }
    if (team.mergedIntoId) {
      throw new InvalidInputError(
        `${team.name} was merged into team "${team.mergedIntoId}"; edit that team instead`,
      );
    }

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.location !== undefined) team.location = dto.location;
    if (dto.imageUrl !== undefined) team.imageUrl = dto.imageUrl;
    if (dto.darkModeImageUrl !== undefined) team.darkModeImageUrl = dto.darkModeImageUrl;
    if (dto.slug !== undefined) team.slug = dto.slug;
    if (dto.active === false && team.players.length > 0) {
      throw new InvalidInputError(
        `Remove the ${team.players.length} current players before marking "${team.name}" inactive`,
      );
    }
    if (dto.active !== undefined) team.active = dto.active;

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

  async initializeTeamsFromPandaScore(cancelIfExistingTeam: boolean): Promise<void> {
    await this.syncPandascoreTeamsUseCase.execute(cancelIfExistingTeam);
  }
}
