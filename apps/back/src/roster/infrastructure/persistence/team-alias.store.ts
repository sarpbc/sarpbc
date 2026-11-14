import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Team as TeamRow } from "./team.entity";
import { TeamAlias as TeamAliasRow } from "./team-alias.entity";
import type { TeamAlias } from "../../domain/team-alias";
import type { TeamAliasWriter } from "../../application/ports";

export class MikroTeamAliasStore implements TeamAliasWriter {
  constructor(private readonly em: EntityManager) {}

  async pandascoreOwner(pandascoreId: number, exceptAliasId: string) {
    const team = await this.em.findOne(TeamRow, { pandascoreId });

    if (team) {
      return team.name;
    }

    const alias = await this.em.findOne(
      TeamAliasRow,
      { pandascoreId, ...(exceptAliasId && { id: { $ne: exceptAliasId } }) },
      { populate: ["team"] },
    );

    return alias ? alias.team.name : null;
  }

  async save(teamId: string, model: TeamAlias) {
    const row = model.id
      ? await this.em.findOneOrFail(TeamAliasRow, { id: model.id })
      : new TeamAliasRow();

    if (!model.id) {
      model.id = v4();
    }

    Object.assign(row, {
      id: model.id,
      team: this.em.getReference(TeamRow, teamId),
      name: model.name,
      validFrom: model.from,
      validTo: model.to,
      sourceUrl: model.sourceUrl,
      logoUrl: model.logoUrl,
      pandascoreId: model.pandascoreId,
    });
    this.em.persist(row);
  }

  async delete(model: TeamAlias) {
    this.em.remove(this.em.getReference(TeamAliasRow, model.id));
  }
}
