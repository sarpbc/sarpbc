import { PlayerPhoto } from "../player.entities";

export interface IPlayerPhotoRepository {
  findByPlayer(playerId: string): Promise<PlayerPhoto[]>;
  findById(id: string): Promise<PlayerPhoto | null>;
  save(photo: PlayerPhoto): Promise<void>;
  delete(photo: PlayerPhoto): Promise<void>;
}
