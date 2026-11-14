import type { TeamAliasInput } from "@sarpbc/types";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import type { Team } from "../domain/roster";
import { TeamAlias, assertTeamAliasFits, requireTeamAliasInput } from "../domain/team-alias";
import type { TeamAliasTransaction, TeamAliasWriteScope } from "./ports";

export class TeamAliasService {
  constructor(private readonly transaction: TeamAliasTransaction) {}

  async requireProposable(teamId: string, input: TeamAliasInput, aliasId?: string): Promise<void> {
    await this.transaction.run((scope) => this.prepare(scope, teamId, input, aliasId));
  }

  async add(teamId: string, input: TeamAliasInput): Promise<TeamAlias> {
    return this.transaction.run(async (scope) => {
      const alias = await this.prepare(scope, teamId, input);
      await scope.aliases.save(teamId, alias);

      return alias;
    });
  }

  async update(teamId: string, aliasId: string, input: TeamAliasInput): Promise<TeamAlias> {
    return this.transaction.run(async (scope) => {
      const alias = await this.prepare(scope, teamId, input, aliasId);
      await scope.aliases.save(teamId, alias);

      return alias;
    });
  }

  async delete(teamId: string, aliasId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      const team = await this.requireTeam(scope, teamId);
      await scope.aliases.delete(this.requireAlias(team, aliasId));
    });
  }

  private async prepare(
    scope: TeamAliasWriteScope,
    teamId: string,
    input: TeamAliasInput,
    aliasId?: string,
  ): Promise<TeamAlias> {
    const team = await this.requireTeam(scope, teamId);
    const id = aliasId === undefined ? "" : this.requireAlias(team, aliasId).id;
    const alias = Object.assign(new TeamAlias(), requireTeamAliasInput(input), { id });
    assertTeamAliasFits(alias, team);

    if (alias.pandascoreId !== null) {
      const owner = await scope.aliases.pandascoreOwner(alias.pandascoreId, id);

      if (owner) {
        throw new ConflictError(
          `PandaScore team ${alias.pandascoreId} already belongs to ${owner}; an alias cannot claim it.`,
        );
      }
    }

    return alias;
  }

  private async requireTeam({ teams }: TeamAliasWriteScope, id: string): Promise<Team> {
    const team = await teams.findById(id);

    if (!team) throw new NotFoundError(`Team with id "${id}" not found`);

    if (team.mergedIntoId) {
      throw new InvalidInputError(
        `${team.name} was merged into team "${team.mergedIntoId}"; edit that team instead`,
      );
    }

    return team;
  }

  private requireAlias(team: Team, aliasId: string): TeamAlias {
    const alias = team.aliases.find(({ id }) => id === aliasId);

    if (!alias) throw new NotFoundError(`Alias "${aliasId}" does not belong to ${team.name}`);

    return alias;
  }
}
