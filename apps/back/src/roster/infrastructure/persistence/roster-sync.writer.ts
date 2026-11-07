import { playerColumns, teamColumns, toPlayer, toTeam } from "./roster.mapper";
import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Contract, Player, Team } from "./player.entities";
import {
  availablePlayerSlug,
  findPandascorePlayer,
  findPandascoreTeam,
} from "./pandascore-adoption";
import type { UpsertPlayerCommand, UpsertTeamCommand } from "../../application/imports";
export class RosterSyncWriter {
  private readonly teams = new Map<string, Team>();
  private readonly players = new Map<number, Player>();
  constructor(private readonly em: Pick<EntityManager, "findOne" | "persist" | "getReference">) {}
  async upsertTeam(input: UpsertTeamCommand): Promise<{ id: string }> {
    const key = input.pandascoreId !== undefined ? String(input.pandascoreId) : input.slug;
    const existing =
      this.teams.get(key) ?? (await findPandascoreTeam(this.em, input.pandascoreId, input.slug));
    const row = existing ?? new Team();
    if (!existing) {
      row.id = v4();
      row.slug = input.slug;
    }
    this.teams.set(key, row);
    const model = toTeam(row, false);
    model.synchronizeProfile(input);
    Object.assign(row, teamColumns(model));
    this.em.persist(row);
    return { id: row.id };
  }
  async upsertPlayer(
    input: UpsertPlayerCommand,
    currentTeamId?: string | null,
  ): Promise<{ id: string }> {
    const existing =
      this.players.get(input.pandascoreId) ??
      (await findPandascorePlayer(this.em, input.pandascoreId, input.slug));
    const row = existing ?? new Player();
    if (!existing) {
      row.id = v4();
      row.slug = await availablePlayerSlug(this.em, input.pandascoreId, input.slug);
    }
    this.players.set(input.pandascoreId, row);
    const model = toPlayer(row);
    model.synchronizeProfile(input);
    Object.assign(row, playerColumns(model));
    if (currentTeamId !== undefined && !(existing && (await this.hasOpenContract(row.id))))
      row.team = currentTeamId === null ? null : this.em.getReference(Team, currentTeamId);
    this.em.persist(row);
    return { id: row.id };
  }
  private async hasOpenContract(playerId: string): Promise<boolean> {
    return (await this.em.findOne(Contract, { player: playerId, endDate: null })) !== null;
  }
}
