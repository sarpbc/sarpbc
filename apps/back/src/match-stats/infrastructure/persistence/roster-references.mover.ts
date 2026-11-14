import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";

/** Game rows reference players and participants, never teams, so a team merge has nothing to move. */
export class MatchStatsRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(MatchGamePlayer, { player: from }, { player: to });
    await this.em.nativeUpdate(PlayerPlatformLink, { player: from }, { player: to });
  }

  async moveTeam(): Promise<void> {
    // No game stats row references a team.
  }
}
