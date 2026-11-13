import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { OnThisDayFact } from "./on-this-day-fact.entities";

export class OnThisDayRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(OnThisDayFact, { player: from }, { player: to });
  }

  async moveTeam(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(OnThisDayFact, { team: from }, { team: to });
  }
}
