import { EntityRepository } from "@mikro-orm/core";
import { AirRiddle } from "./domain/airriddle.entity";

export class AirRiddleRepository extends EntityRepository<AirRiddle> {
  async findTodaysRiddle(todayStart: Date): Promise<AirRiddle | null> {
    return this.findOne({ createdAt: { $gte: todayStart } });
  }

  async save(riddle: AirRiddle): Promise<void> {
    await this.getEntityManager().persist(riddle).flush();
  }
}
