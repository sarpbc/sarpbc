import { EntityManager } from "@mikro-orm/postgresql";
import { Team } from "./player.entities";
import { RosterSyncWriter } from "./roster-sync.writer";
import type { ImportedPlayer } from "../../application/imports";
import type { CurrentRosterWriter } from "../../application/ports";

export class MikroCurrentRosterWriter implements CurrentRosterWriter {
  constructor(private readonly em: EntityManager) {}

  async hasTeams(): Promise<boolean> {
    return (await this.em.fork().count(Team, {})) > 0;
  }

  async syncCurrentTeams(roster: ImportedPlayer[]): Promise<void> {
    await this.em.fork().transactional(async (tx) => {
      const writer = new RosterSyncWriter(tx);
      const teams = new Map<string, string>();
      for (const entry of roster) {
        if (entry.currentTeam && !teams.has(entry.currentTeam.slug)) {
          teams.set(entry.currentTeam.slug, (await writer.upsertTeam(entry.currentTeam)).id);
        }
      }
      await tx.flush();
      for (const entry of roster) {
        await writer.upsertPlayer(
          entry.player,
          entry.currentTeam ? (teams.get(entry.currentTeam.slug) ?? null) : null,
        );
      }
      await tx.flush();
    });
  }
}
