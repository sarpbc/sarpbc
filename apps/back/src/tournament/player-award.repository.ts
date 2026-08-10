import { EntityRepository } from "@mikro-orm/core";
import { PlayerAward } from "./player-award.entities";

export class PlayerAwardRepository extends EntityRepository<PlayerAward> {
  async findByPlayerId(playerId: string): Promise<PlayerAward[]> {
    return this.find(
      { player: { id: playerId } },
      {
        populate: ["tournament", "tournament.league"],
        orderBy: { tournament: { endAt: "DESC" } },
      },
    );
  }

  async findByTournamentId(tournamentId: string): Promise<PlayerAward[]> {
    return this.find(
      { tournament: { id: tournamentId } },
      {
        populate: ["player", "participant", "participant.team"],
        orderBy: { createdAt: "ASC" },
      },
    );
  }

  async findByTournamentAndId(tournamentId: string, awardId: string): Promise<PlayerAward | null> {
    return this.findOne({ id: awardId, tournament: { id: tournamentId } });
  }

  async save(award: PlayerAward): Promise<void> {
    await this.em.persist(award).flush();
  }

  async delete(award: PlayerAward): Promise<void> {
    await this.em.remove(award).flush();
  }
}
