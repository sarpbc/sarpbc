import { EntityRepository } from "@mikro-orm/core";
import { PlayerPhoto } from "./player.entities";
import { IPlayerPhotoRepository } from "./domain/player-photo.repository.interface";

export class PlayerPhotoRepository
  extends EntityRepository<PlayerPhoto>
  implements IPlayerPhotoRepository
{
  async findByPlayer(playerId: string): Promise<PlayerPhoto[]> {
    return this.find({ player: { id: playerId } }, { orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<PlayerPhoto | null> {
    return this.findOne({ id });
  }

  async save(photo: PlayerPhoto): Promise<void> {
    await this.em.persist(photo).flush();
  }

  async delete(photo: PlayerPhoto): Promise<void> {
    await this.em.remove(photo).flush();
  }
}
