import { EntityRepository } from "@mikro-orm/postgresql";
import { PickemChoice } from "./domain/pickem.entity";

export class PickemRepository extends EntityRepository<PickemChoice> {
  async findByTournament(tournamentId: string): Promise<PickemChoice[]> {
    return this.find(
      { match: { tournament: { id: tournamentId } } },
      { populate: ["user", "match", "pickedParticipant"] },
    );
  }

  async findUserPicksForTournament(tournamentId: string, userId: string): Promise<PickemChoice[]> {
    return this.find(
      {
        user: { id: userId },
        match: { tournament: { id: tournamentId } },
      },
      { populate: ["match", "pickedParticipant"] },
    );
  }

  async findByUserAndMatch(userId: string, matchId: string): Promise<PickemChoice | null> {
    return this.findOne({ user: { id: userId }, match: { id: matchId } });
  }

  async findUnscoredByMatch(matchId: string): Promise<PickemChoice[]> {
    return this.find(
      { match: { id: matchId }, scored: false },
      { populate: ["pickedParticipant", "user"] },
    );
  }

  async findScoredByTournament(tournamentId: string): Promise<PickemChoice[]> {
    return this.find(
      { match: { tournament: { id: tournamentId } }, scored: true },
      { populate: ["user"] },
    );
  }

  async save(pick: PickemChoice): Promise<void> {
    await this.getEntityManager().persist(pick).flush();
  }

  async saveMany(picks: PickemChoice[]): Promise<void> {
    for (const pick of picks) {
      this.getEntityManager().persist(pick);
    }
    await this.getEntityManager().flush();
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
}
