import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { MatchGamePlayer, PlayerPlatformLink } from "./match-stats.entities";

/** Game rows reference players and participants, never teams, so a team merge has nothing to move. */
export class MatchStatsRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(MatchGamePlayer, { player: from }, { player: to });
    await this.em.nativeUpdate(PlayerPlatformLink, { player: from }, { player: to });
  }

  async moveTeam(): Promise<void> {}
}
