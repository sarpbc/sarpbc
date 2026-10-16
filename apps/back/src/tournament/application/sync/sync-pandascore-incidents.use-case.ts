import type { PandascoreGateway } from "../../../pandascore/application/ports/pandascore.gateway.port";
import type { SyncCursorRepository } from "../../../pandascore/domain/sync-cursor.repository.interface";
import type { CompetitionDiagnostics } from "../ports";
import { CompetitionSyncService } from "./competition-sync.service";
export class SyncPandascoreIncidentsUseCase {
  constructor(
    private readonly feed: PandascoreGateway,
    private readonly cursor: SyncCursorRepository,
    private readonly synchronization: CompetitionSyncService,
    private readonly diagnostics: CompetitionDiagnostics,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async execute(): Promise<void> {
    const since =
      (await this.cursor.getLastSyncAt()) ?? new Date(this.now().getTime() - 24 * 60 * 60 * 1000);
    const incidents = await this.feed.listIncidents({
      since,
      videogame: ["rl"],
      sort: "modified_at",
      perPage: 100,
    });
    if (!incidents.length) {
      await this.cursor.setLastSyncAt(this.now());
      return;
    }
    let latest = since;
    for (const incident of incidents) {
      try {
        if (incident.changeType !== "deletion") {
          const backfill =
            incident.kind === "match" &&
            !(await this.synchronization.findTournamentByPandascoreId(
              incident.command.tournamentPandascoreId,
            ))
              ? await this.feed.getTournamentById(incident.command.tournamentPandascoreId)
              : undefined;
          await this.synchronization.applyIncident(incident, backfill);
        }
      } catch (error) {
        this.diagnostics.error("PandaScore incident failed: " + incident.id, error);
      }
      if (incident.modifiedAt > latest) latest = incident.modifiedAt;
    }
    await this.cursor.setLastSyncAt(latest);
  }
}
