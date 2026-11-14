import type { EntityManager } from "@mikro-orm/postgresql";
import { mapSequentially } from "../../../common/application/sequentially";
import { Team } from "./team.entity";
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

      const currentTeams = roster.flatMap((entry) =>
        entry.currentTeam ? [entry.currentTeam] : [],
      );

      const firstBySlug = currentTeams.filter(
        (team, index) => currentTeams.findIndex((other) => other.slug === team.slug) === index,
      );

      const teamIds = new Map(
        await mapSequentially(firstBySlug, async (team): Promise<[string, string]> => {
          const { id } = await writer.upsertTeam(team);

          return [team.slug, id];
        }),
      );

      await tx.flush();

      await mapSequentially(
        roster,
        async (entry) =>
          await writer.upsertPlayer(
            entry.player,
            entry.currentTeam ? (teamIds.get(entry.currentTeam.slug) ?? null) : null,
          ),
      );

      await tx.flush();
    });
  }
}
