import { toSlug } from "@sarpbc/utils";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { CreateTeamInput, UpdateTeamInput } from "./inputs";
import { Team } from "../domain/team";
import { assertTeamDeletable } from "../domain/team-deletion";
import type {
  RosterTransaction,
  RosterWriteScope,
  TeamCompetitionUsage,
  TeamQueries,
} from "./ports";
import type { DirectorySearchProps } from "./search-props";

export class TeamService {
  constructor(
    private readonly teams: TeamQueries,
    private readonly transaction: RosterTransaction,
    private readonly usage: TeamCompetitionUsage,
  ) {}

  async find(options: Partial<DirectorySearchProps>): Promise<Team[]> {
    return await this.teams.search(options);
  }

  async findAndCount(options: Partial<DirectorySearchProps>): Promise<[Team[], number]> {
    return await this.teams.searchAndCount(options);
  }

  async findById(id: string): Promise<Team | null> {
    return await this.resolveMerged(await this.teams.findById(id));
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return await this.resolveMerged(await this.teams.findBySlug(slug));
  }

  private async resolveMerged(team: Team | null): Promise<Team | null> {
    return team?.mergedIntoId !== null &&
      team?.mergedIntoId !== undefined &&
      team.mergedIntoId !== ""
      ? await this.teams.findById(team.mergedIntoId)
      : team;
  }

  async create(dto: CreateTeamInput): Promise<Team> {
    return await this.transaction.run(async ({ teams }) => {
      const team = new Team();
      team.name = dto.name;
      team.location = dto.location ?? null;
      team.imageUrl = dto.imageUrl ?? null;
      team.darkModeImageUrl = dto.darkModeImageUrl ?? null;
      team.slug = dto.slug ?? (toSlug(dto.name) || "team");

      if (dto.source !== undefined) team.source = dto.source;

      if (await teams.findBySlug(team.slug)) {
        throw new ConflictError(`A team with slug "${team.slug}" already exists`);
      }

      await teams.save(team);

      return team;
    });
  }

  async update(id: string, dto: UpdateTeamInput): Promise<Team> {
    return await this.transaction.run(async ({ teams }) => {
      const team = await teams.findById(id);

      if (!team) {
        throw new NotFoundError(`Team with id "${id}" not found`);
      }

      if (team.mergedIntoId !== null && team.mergedIntoId !== "") {
        throw new InvalidInputError(
          `${team.name} was merged into team "${team.mergedIntoId}"; edit that team instead`,
        );
      }

      if (dto.name !== undefined) team.name = dto.name;

      if (dto.location !== undefined) team.location = dto.location;

      if (dto.imageUrl !== undefined) team.imageUrl = dto.imageUrl;

      if (dto.darkModeImageUrl !== undefined) team.darkModeImageUrl = dto.darkModeImageUrl;

      if (dto.logoLightUrl !== undefined) team.logoLightUrl = dto.logoLightUrl;

      if (dto.logoDarkUrl !== undefined) team.logoDarkUrl = dto.logoDarkUrl;

      if (dto.slug !== undefined) team.slug = dto.slug;

      if (dto.active === false && team.players.length > 0) {
        throw new InvalidInputError(
          `Remove the ${team.players.length} current players before marking "${team.name}" inactive`,
        );
      }

      if (dto.active !== undefined) team.active = dto.active;

      await teams.save(team);

      return team;
    });
  }

  async requireDeletable(id: string): Promise<void> {
    await this.transaction.run(async (scope) => await this.deletable(scope, id));
  }

  async delete(id: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      await scope.teams.delete(await this.deletable(scope, id));
    });
  }

  private async deletable({ teams, contracts }: RosterWriteScope, id: string): Promise<Team> {
    const team = await teams.findById(id);

    if (!team) throw new NotFoundError(`Team with id "${id}" not found`);
    const teamContracts = await contracts.findByTeam(id);
    const references = await this.usage.teamReferences(id);

    assertTeamDeletable(team, {
      players: team.players.length,
      contracts: teamContracts.length,
      redirects: await teams.redirectCount(id),
      ...references,
    });

    return team;
  }
}
