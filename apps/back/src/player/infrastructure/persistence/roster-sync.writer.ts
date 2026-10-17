import { toPlayer, toTeam } from "./roster.mapper";
import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Player, Team } from "./player.entities";
import { availablePlayerSlug, findPandascorePlayer } from "./find-pandascore-player";
import type { UpsertPlayerCommand } from "../../../pandascore/application/commands/upsert-player.command";
import type { UpsertTeamCommand } from "../../../pandascore/application/commands/upsert-team.command";
export class RosterSyncWriter {
  private readonly teams = new Map<string, Team>();
  private readonly players = new Map<number, Player>();
  constructor(private readonly em: Pick<EntityManager, "findOne" | "persist" | "getReference">) {}
  async upsertTeam(input: UpsertTeamCommand): Promise<{ id: string }> {
    const key = input.pandascoreId !== undefined ? String(input.pandascoreId) : input.slug;
    const existing =
      this.teams.get(key) ??
      (input.pandascoreId !== undefined
        ? await this.em.findOne(Team, { pandascoreId: input.pandascoreId })
        : null) ??
      (await this.em.findOne(Team, { slug: input.slug, pandascoreId: null }));
    const row = existing ?? new Team();
    if (!existing) {
      row.id = v4();
      row.slug = input.slug;
    }
    this.teams.set(key, row);
    const model = toTeam(row, false);
    model.synchronizeProfile(input);
    Object.assign(row, {
      name: model.name,
      pandascoreId: model.pandascoreId,
      location: model.location,
      imageUrl: model.imageUrl,
      darkModeImageUrl: model.darkModeImageUrl,
    });
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
    Object.assign(row, {
      pandascoreId: model.pandascoreId,
      name: model.name,
      firstName: model.firstName,
      lastName: model.lastName,
      birthday: model.birthday,
      nationality: model.nationality,
      imageUrl: model.imageUrl,
      role: model.role,
    });
    if (currentTeamId !== undefined)
      row.team = currentTeamId === null ? null : this.em.getReference(Team, currentTeamId);
    this.em.persist(row);
    return { id: row.id };
  }
}
