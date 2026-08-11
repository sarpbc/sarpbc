import { Injectable } from "@nestjs/common";
import { createLogger } from "evlog";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncPandascoreAdditionsUseCase } from "./sync-pandascore-additions.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

export interface SyncNewTournamentsResult {
  discovered: number;
  detailsSynced: number;
  detailsFailed: number;
}

/**
 * Discovers tournaments missing from the local DB (past/upcoming/running),
 * syncs their details/matches, then runs the incremental additions feed.
 *
 * Additions alone are not enough: PandaScore often omits tournament creations
 * from the videogame-filtered feed, so a reconcile pass is required.
 */
@Injectable()
export class SyncNewTournamentsUseCase {
  constructor(
    private readonly syncAllTournamentsUseCase: SyncAllTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly syncPandascoreAdditionsUseCase: SyncPandascoreAdditionsUseCase,
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

      await this.syncPandascoreAdditionsUseCase.execute();

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
