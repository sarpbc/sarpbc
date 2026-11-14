import { mapSequentially } from "../../../common/application/sequentially";
import type { CompetitionDiagnostics } from "../ports";
import type { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import type { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
import type { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";

export interface SyncNewTournamentsResult {
  discovered: number;
  detailsSynced: number;
  detailsFailed: number;
}

export class SyncNewTournamentsUseCase {
  constructor(
    private readonly additions: SyncAllTournamentsUseCase,
    private readonly details: SyncPandascoreTournamentUseCase,
    private readonly incidents: SyncPandascoreIncidentsUseCase,
    private readonly diagnostics: CompetitionDiagnostics,
  ) {}
  async execute(): Promise<SyncNewTournamentsResult> {
    const ids = await this.additions.execute();

    // One tournament at a time: the provider API is rate limited.
    const synced = await mapSequentially(ids, async (id) => {
      try {
        await this.details.execute(id);

        return true;
      } catch (error) {
        this.diagnostics.error(`Tournament detail sync failed: ${id}`, error);

        return false;
      }
    });

    const detailsSynced = synced.filter(Boolean).length;
    const detailsFailed = synced.length - detailsSynced;

    await this.incidents.execute();

    return { discovered: ids.length, detailsSynced, detailsFailed };
  }
}
