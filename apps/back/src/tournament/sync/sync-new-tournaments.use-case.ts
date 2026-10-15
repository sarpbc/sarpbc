import { Injectable } from "@nestjs/common";
import { createLogger } from "evlog";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

export interface SyncNewTournamentsResult {
  discovered: number;
  detailsSynced: number;
  detailsFailed: number;
}

/**
 * PandaScore often omits tournament creations from the videogame-filtered
 * incidents feed, so a full reconcile pass is required first.
 */
@Injectable()
export class SyncNewTournamentsUseCase {
  constructor(
    private readonly syncAllTournamentsUseCase: SyncAllTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly syncPandascoreIncidentsUseCase: SyncPandascoreIncidentsUseCase,
  ) {}

  async execute(): Promise<SyncNewTournamentsResult> {
    const log = createLogger({ component: SyncNewTournamentsUseCase.name });

    try {
      const newTournamentIds = await this.syncAllTournamentsUseCase.execute();

      let detailsSynced = 0;
      let detailsFailed = 0;

      for (const tournamentId of newTournamentIds) {
        try {
          await this.syncPandascoreTournamentUseCase.execute(tournamentId);
          detailsSynced += 1;
        } catch (error) {
          detailsFailed += 1;
          log.set({ tournamentId });
          log.error(error instanceof Error ? error : new Error(String(error)));
        }
      }

      await this.syncPandascoreIncidentsUseCase.execute();

      const result: SyncNewTournamentsResult = {
        discovered: newTournamentIds.length,
        detailsSynced,
        detailsFailed,
      };
      log.set({ sync: result });
      return result;
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      log.emit();
    }
  }
}
