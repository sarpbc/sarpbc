import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Team as TeamRow } from "./team.entity";
import { TeamAlias as TeamAliasRow } from "./team-alias.entity";
import { teamColumns, toTeam } from "./roster.mapper";
import type { Team } from "../../domain/team";
import type { TeamQueries, TeamWriter } from "../../application/ports";
import type { DirectorySearchProps } from "../../application/search-props";
import { directoryQuery } from "./directory-query";

const teamOptions = { populate: ["players", "players.team"] as const };

export class MikroTeamStore implements TeamQueries, TeamWriter {
  constructor(private readonly em: EntityManager) {}

  private async teamDirectoryQuery(options: Partial<DirectorySearchProps>) {
    const { where, page } = directoryQuery(options);

    if (options.name === undefined || options.name === "") {
      return { where, page };
    }

    const aliases = await this.em.find(
      TeamAliasRow,
      { name: { $ilike: `%${options.name}%` } },
      { fields: ["team"] },
    );

    if (aliases.length === 0) {
      return { where, page };
    }

    const { name, ...rest } = where;
    const formerly = { id: { $in: [...new Set(aliases.map(({ team }) => team.id))] } };

    return { where: { ...rest, $or: [{ name }, formerly] }, page };
  }

  async search(options: Partial<DirectorySearchProps>) {
    const { where, page } = await this.teamDirectoryQuery(options);

    const rows = await this.em.find(TeamRow, where, { ...teamOptions, ...page });

    return rows.map((row) => toTeam(row));
  }

  async searchAndCount(options: Partial<DirectorySearchProps>): Promise<[Team[], number]> {
    const { where, page } = await this.teamDirectoryQuery(options);
    const [rows, count] = await this.em.findAndCount(TeamRow, where, { ...teamOptions, ...page });

    return [rows.map((row) => toTeam(row)), count];
  }

  async findById(id: string) {
    const row = await this.em.findOne(TeamRow, { id }, teamOptions);

    return row ? toTeam(row) : null;
  }

  async findBySlug(slug: string) {
    const row = await this.em.findOne(TeamRow, { slug }, teamOptions);

    return row ? toTeam(row) : null;
  }

  async redirectCount(id: string) {
    return await this.em.count(TeamRow, { mergedInto: id });
  }

  async save(model: Team) {
    const row = model.id ? await this.em.findOneOrFail(TeamRow, { id: model.id }) : new TeamRow();

    if (!model.id) {
      model.id = v4();
    }

    Object.assign(row, teamColumns(model), {
      mergedInto:
        model.mergedIntoId !== null && model.mergedIntoId !== ""
          ? this.em.getReference(TeamRow, model.mergedIntoId)
          : null,
    });
    this.em.persist(row);
  }

  async delete(model: Team) {
    this.em.remove(this.em.getReference(TeamRow, model.id));
  }
}
