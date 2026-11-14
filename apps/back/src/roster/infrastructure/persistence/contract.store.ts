import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Player as PlayerRow } from "./player.entity";
import { Team as TeamRow } from "./team.entity";
import { Contract as ContractRow } from "./contract.entity";
import type { FilterQuery } from "@mikro-orm/core";
import { toContract } from "./roster.mapper";
import type { Contract } from "../../domain/contract";
import type { ContractQueries, ContractWriter } from "../../application/ports";
import type { ContractMovementFilter } from "../../application/search-props";

const contractOptions = { populate: ["player", "player.team", "team"] as const };

export class MikroContractStore implements ContractQueries, ContractWriter {
  constructor(private readonly em: EntityManager) {}

  private async list(where: FilterQuery<ContractRow>, past = false) {
    const rows = await this.em.find(ContractRow, where, {
      ...contractOptions,
      orderBy: past ? { endDate: "desc" } : { startDate: "desc" },
    });

    return rows.map(toContract);
  }

  async findByPlayer(id: string) {
    return await this.list({ player: { id } });
  }

  async findPastContractsByPlayer(id: string) {
    return await this.list({ endDate: { $ne: null }, player: { id } }, true);
  }

  async findByTeam(id: string) {
    return await this.list({ team: { id } });
  }

  async findFormerPlayersByTeam(id: string) {
    return await this.list({ endDate: { $ne: null }, team: { id } }, true);
  }

  async findMovements({ teamId, playerId }: ContractMovementFilter) {
    const where: FilterQuery<ContractRow> = {
      ...(teamId !== undefined && teamId !== "" && { team: teamId }),
      ...(playerId !== undefined && playerId !== "" && { player: playerId }),
    };

    const rows = await this.em.find(ContractRow, where, { populate: ["player", "team"] });

    return rows.map(toContract);
  }

  async findMovementsOnDay(month: number, day: number) {
    const ids: { id: string }[] = await this.em
      .getConnection()
      .execute(
        "SELECT id FROM contract WHERE (extract(month from start_date) = ? AND extract(day from start_date) = ?) OR (extract(month from end_date) = ? AND extract(day from end_date) = ?)",
        [month, day, month, day],
      );

    if (ids.length === 0) {
      return [];
    }

    const rows = await this.em.find(
      ContractRow,
      { id: { $in: ids.map(({ id }) => id) } },
      { populate: ["player", "team"] },
    );

    return rows.map(toContract);
  }

  async findById(id: string) {
    const row = await this.em.findOne(ContractRow, { id }, contractOptions);

    return row ? toContract(row) : null;
  }

  async save(model: Contract) {
    const row = model.id
      ? await this.em.findOneOrFail(ContractRow, { id: model.id })
      : new ContractRow();

    if (!model.id) {
      model.id = v4();
    }

    Object.assign(row, {
      createdAt: model.createdAt,
      endDate: model.endDate,
      id: model.id,
      joinSourceUrl: model.joinSourceUrl,
      leaveSourceUrl: model.leaveSourceUrl,
      player: this.em.getReference(PlayerRow, model.player.id),
      role: model.role,
      startDate: model.startDate,
      team: this.em.getReference(TeamRow, model.team.id),
    });
    this.em.persist(row);
  }

  async delete(model: Contract) {
    this.em.remove(this.em.getReference(ContractRow, model.id));
  }
}
