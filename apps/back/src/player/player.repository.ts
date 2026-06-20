import { EntityRepository } from "@mikro-orm/postgresql";
import { Player } from "./domain/player.entity";
import { IPlayerRepository } from "./domain/player.repository.interface";
import { PlayerSearchProps } from "./interfaces/search-player-props";

export class PlayerRepository extends EntityRepository<Player> implements IPlayerRepository {
  async search({ name, limit = 25, offset = 0 }: Partial<PlayerSearchProps>): Promise<Player[]> {
    const where: Record<string, any> = {};
    if (name) {
      where.name = { $ilike: `%${name}%` };
    }
    return this.find(where, { limit, offset, orderBy: { name: "asc" } });
  }

  async searchAndCount({
    name,
    start,
    limit = 25,
    offset = 0,
  }: Partial<PlayerSearchProps>): Promise<[Player[], number]> {
    const where: Record<string, any> = {};
    if (name) {
      where.name = { $ilike: `%${name}%` };
    }
    if (start) {
      where.name = { $ilike: `${start}%` };
    }
    return this.findAndCount(where, {
      limit,
      offset,
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<Player | null> {
    return this.findOne({ id });
  }

  async findBySlug(slug: string): Promise<Player | null> {
    return this.findOne({ slug }, { populate: ["team"] });
  }

  async getRandomPlayer(): Promise<Player | null> {
    const players = await this.findAll();
    if (players.length === 0) return null;
    return players[Math.floor(Math.random() * players.length)];
  }

  async save(player: Player): Promise<void> {
    await this.em.persist(player).flush();
  }

  async saveMany(players: Player[]): Promise<void> {
    for (const player of players) {
      this.em.persist(player);
    }
    await this.em.flush();
  }

  async delete(player: Player): Promise<void> {
    await this.em.remove(player).flush();
  }
}
