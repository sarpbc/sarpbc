import { Player } from "../player.entities";
import { PlayerSearchProps } from "../interfaces/search-player-props";

export const PLAYER_REPOSITORY = Symbol("PLAYER_REPOSITORY");

export interface IPlayerRepository {
  search(options: Partial<PlayerSearchProps>): Promise<Player[]>;
  searchAndCount(options: Partial<PlayerSearchProps>): Promise<[Player[], number]>;
  findById(id: string): Promise<Player | null>;
  findBySlug(slug: string): Promise<Player | null>;
  getRandomPlayer(): Promise<Player | null>;
  save(player: Player): Promise<void>;
  saveMany(players: Player[]): Promise<void>;
  delete(player: Player): Promise<void>;
}
