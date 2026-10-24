import { EntityManager } from "@mikro-orm/postgresql";
import { Team } from "./player.entities";
import { RosterSyncWriter } from "./roster-sync.writer";
import type { CurrentRoster, CurrentRosterWriter } from "../../application/ports";

export class MikroCurrentRosterWriter implements CurrentRosterWriter {
  constructor(private readonly em: EntityManager) {}

  async hasTeams(): Promise<boolean> {
    return (await this.em.fork().count(Team, {})) > 0;
  }

  async syncCurrentTeams(roster: CurrentRoster[]): Promise<void> {
    await this.em.fork().transactional(async (tx) => {
      const writer = new RosterSyncWriter(tx);
      const teams = new Map<string, string>();
      for (const entry of roster) {
        if (entry.team && !teams.has(entry.team.slug)) {
          teams.set(entry.team.slug, (await writer.upsertTeam(entry.team)).id);
        }
      }
      await tx.flush();
      for (const entry of roster) {
        await writer.upsertPlayer(
          entry.player,
          entry.team ? (teams.get(entry.team.slug) ?? null) : null,
        );
      }
      await tx.flush();
    });
  }
}
