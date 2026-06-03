import { PlayerPhoto } from "./player-photo.entity";

export interface IPlayerPhotoRepository {
  findByPlayer(playerId: string): Promise<PlayerPhoto[]>;
  findById(id: string): Promise<PlayerPhoto | null>;
  save(photo: PlayerPhoto): Promise<void>;
  delete(photo: PlayerPhoto): Promise<void>;
}
