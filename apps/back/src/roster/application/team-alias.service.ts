import type { TeamAliasInput } from "@sarpbc/types";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { Team } from "../domain/team";
import { TeamAlias, assertTeamAliasFits, requireTeamAliasInput } from "../domain/team-alias";
import type { TeamAliasTransaction, TeamAliasWriteScope } from "./ports";

const requireTeamForAlias = async ({ teams }: TeamAliasWriteScope, id: string): Promise<Team> => {
  const team = await teams.findById(id);

  if (!team) {
    throw new NotFoundError(`Team with id "${id}" not found`);
  }

  if (team.mergedIntoId !== null && team.mergedIntoId !== "") {
    throw new InvalidInputError(
      `${team.name} was merged into team "${team.mergedIntoId}"; edit that team instead`,
    );
  }

  return team;
};

const requireTeamAlias = (team: Team, aliasId: string): TeamAlias => {
  const alias = team.aliases.find(({ id }) => id === aliasId);

  if (!alias) {
    throw new NotFoundError(`Alias "${aliasId}" does not belong to ${team.name}`);
  }

  return alias;
};

const prepareAlias = async (
  scope: TeamAliasWriteScope,
  teamId: string,
  input: TeamAliasInput,
  aliasId?: string,
): Promise<TeamAlias> => {
  const team = await requireTeamForAlias(scope, teamId);
  const id = aliasId === undefined ? "" : requireTeamAlias(team, aliasId).id;
  const alias = Object.assign(new TeamAlias(), requireTeamAliasInput(input), { id });
  assertTeamAliasFits(alias, team);

  if (alias.pandascoreId !== null) {
    const owner = await scope.aliases.pandascoreOwner(alias.pandascoreId, id);

    if (owner !== null && owner !== "") {
      throw new ConflictError(
        `PandaScore team ${alias.pandascoreId} already belongs to ${owner}; an alias cannot claim it.`,
      );
    }
  }

  return alias;
};

export class TeamAliasService {
  constructor(private readonly transaction: TeamAliasTransaction) {}

  async requireProposable(teamId: string, input: TeamAliasInput, aliasId?: string): Promise<void> {
    await this.transaction.run(async (scope) => await prepareAlias(scope, teamId, input, aliasId));
  }

  async add(teamId: string, input: TeamAliasInput): Promise<TeamAlias> {
    return await this.transaction.run(async (scope) => {
      const alias = await prepareAlias(scope, teamId, input);
      await scope.aliases.save(teamId, alias);

      return alias;
    });
  }

  async update(teamId: string, aliasId: string, input: TeamAliasInput): Promise<TeamAlias> {
    return await this.transaction.run(async (scope) => {
      const alias = await prepareAlias(scope, teamId, input, aliasId);
      await scope.aliases.save(teamId, alias);

      return alias;
    });
  }

  async delete(teamId: string, aliasId: string): Promise<void> {
    await this.transaction.run(async (scope) => {
      const team = await requireTeamForAlias(scope, teamId);
      await scope.aliases.delete(requireTeamAlias(team, aliasId));
    });
  }
}
