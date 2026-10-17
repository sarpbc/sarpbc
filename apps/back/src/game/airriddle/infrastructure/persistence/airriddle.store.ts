import { EntityManager } from "@mikro-orm/postgresql";
import { AirRiddle } from "./airriddle.entity";
import type { DailyRiddles } from "../../application/ports";
import type { DailyRiddle } from "../../domain/airriddle";
export class MikroDailyRiddles implements DailyRiddles {
  constructor(private readonly em: EntityManager) {}
  async findTodaysRiddle(start: Date): Promise<DailyRiddle | null> {
    const row = await this.em.findOne(AirRiddle, { createdAt: { $gte: start } });
    return row
      ? {
          id: row.id,
          playerId: row.playerId,
          playerName: row.playerName,
          createdAt: new Date(row.createdAt),
        }
      : null;
  }
  async save(riddle: DailyRiddle): Promise<void> {
    this.em.persist(Object.assign(new AirRiddle(), riddle));
    await this.em.flush();
  }
}
