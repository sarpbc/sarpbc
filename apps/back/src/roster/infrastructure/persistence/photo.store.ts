import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { Player as PlayerRow } from "./player.entity";
import { PlayerPhoto as PlayerPhotoRow } from "./player-photo.entity";
import { toPhoto } from "./roster.mapper";
import type { PlayerPhoto } from "../../domain/player-photo";
import type { PhotoQueries, PhotoWriter } from "../../application/ports";

export class MikroPhotoStore implements PhotoQueries, PhotoWriter {
  constructor(private readonly em: EntityManager) {}

  async findByPlayer(id: string) {
    const rows = await this.em.find(
      PlayerPhotoRow,
      { player: { id } },
      { orderBy: { createdAt: "desc" } },
    );

    return rows.map((row) => toPhoto(row));
  }

  async findById(id: string) {
    const row = await this.em.findOne(PlayerPhotoRow, { id });

    return row ? toPhoto(row) : null;
  }

  async save(model: PlayerPhoto) {
    const row = new PlayerPhotoRow();

    if (!model.id) {
      model.id = v4();
    }

    Object.assign(row, {
      id: model.id,
      player: this.em.getReference(PlayerRow, model.player.id),
      url: model.url,
      createdAt: model.createdAt,
    });
    this.em.persist(row);
  }

  async delete(model: PlayerPhoto) {
    this.em.remove(this.em.getReference(PlayerPhotoRow, model.id));
  }
}
