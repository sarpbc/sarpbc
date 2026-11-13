import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { SeasonAward } from "./season.entities";

export class SeasonRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(SeasonAward, { player: from }, { player: to });
  }

  async moveTeam(): Promise<void> {}
}
