import { mapSequentially } from "../../../common/application/sequentially";
import type { CompetitionFeed } from "../feed";
import type { CompetitionDiagnostics, SyncCursor, TournamentQueries } from "../ports";
import { CompetitionSyncService } from "./competition-sync.service";

const FALLBACK_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export class SyncPandascoreIncidentsUseCase {
  constructor(
    private readonly feed: CompetitionFeed,
    private readonly cursor: SyncCursor,
    private readonly reads: Pick<TournamentQueries, "findByPandascoreId">,
    private readonly synchronization: CompetitionSyncService,
    private readonly diagnostics: CompetitionDiagnostics,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async execute(): Promise<void> {
    const since =
      (await this.cursor.getLastSyncAt()) ?? new Date(this.now().getTime() - FALLBACK_LOOKBACK_MS);

    const incidents = await this.feed.listIncidents({ since });

    if (!incidents.length) {
      await this.cursor.setLastSyncAt(this.now());

      return;
    }

    // Incidents are applied in feed order: later ones can depend on earlier ones.
    const failures = await mapSequentially(incidents, async (incident) => {
      try {
        const backfill =
          incident.changeType !== "deletion" &&
          incident.kind === "match" &&
          !(await this.reads.findByPandascoreId(incident.command.tournamentPandascoreId))
            ? await this.feed.getTournamentById(incident.command.tournamentPandascoreId)
            : undefined;

        await this.synchronization.applyIncident(incident, backfill);

        return null;
      } catch (error) {
        this.diagnostics.error(`PandaScore incident failed: ${incident.id}`, error);

        return incident.modifiedAt;
      }
    });

    let latest = since;
    let earliestFailure: Date | null = null;

    for (const incident of incidents) {
      if (incident.modifiedAt > latest) {
        latest = incident.modifiedAt;
      }
    }

    for (const failedAt of failures) {
      if (failedAt !== null && (!earliestFailure || failedAt < earliestFailure)) {
        earliestFailure = failedAt;
      }
    }

    await this.cursor.setLastSyncAt(
      earliestFailure ? new Date(Math.max(since.getTime(), earliestFailure.getTime() - 1)) : latest,
    );
  }
}
