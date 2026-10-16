import type { CompetitionDiagnostics } from "../ports";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
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
    let detailsSynced = 0,
      detailsFailed = 0;
    for (const id of ids) {
      try {
        await this.details.execute(id);
        detailsSynced++;
      } catch (error) {
        detailsFailed++;
        this.diagnostics.error("Tournament detail sync failed: " + id, error);
      }
    }
    await this.incidents.execute();
    return { discovered: ids.length, detailsSynced, detailsFailed };
  }
}
