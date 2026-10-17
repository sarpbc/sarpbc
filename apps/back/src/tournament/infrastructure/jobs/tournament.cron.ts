import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { createLogger } from "evlog";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { MatchService } from "../../application/match/match.service";
import { TournamentService } from "../../application/tournament.service";

@Injectable()
export class TournamentCron {
  constructor(
    private readonly orm: MikroORM,
    private readonly syncNewTournamentsUseCase: SyncNewTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly matchService: MatchService,
    private readonly tournamentService: TournamentService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @CreateRequestContext()
  async syncActiveTournaments() {
    const log = createLogger({
      component: TournamentCron.name,
      job: "syncActiveTournaments",
    });

    try {
      const liveMatches = await this.matchService.findLive({
        limit: 100,
        offset: 0,
        todayOnly: false,
      });

      const recentlyEndedMatches = await this.matchService.findRecentlyEnded({
        limit: 100,
        minutesAgo: 15,
      });

      const activeTournamentIds = await this.tournamentService.findPandascoreActiveIds();

      const tournamentIds = new Set<string>(activeTournamentIds);
      for (const match of [...liveMatches, ...recentlyEndedMatches]) {
        if (match.tournament?.id) {
          tournamentIds.add(match.tournament.id);
        }
      }

      log.set({
        matches: {
          live: liveMatches.length,
          recentlyEnded: recentlyEndedMatches.length,
        },
        tournaments: {
          active: activeTournamentIds.length,
          total: tournamentIds.size,
        },
      });

      if (tournamentIds.size === 0) {
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const tournamentId of tournamentIds) {
        try {
          await this.syncPandascoreTournamentUseCase.execute(tournamentId);
          synced += 1;
        } catch (error) {
          failed += 1;
          log.set({ tournamentId });
          log.error(error instanceof Error ? error : new Error(String(error)));
        }
      }

      log.set({ sync: { synced, failed } });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
    } finally {
      log.emit();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @CreateRequestContext()
  async syncPandascoreAdditionsDaily() {
    const log = createLogger({
      component: TournamentCron.name,
      job: "syncPandascoreAdditionsDaily",
    });

    try {
      const result = await this.syncNewTournamentsUseCase.execute();
      log.set({ jobStatus: "completed", sync: result });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
    } finally {
      log.emit();
    }
  }
}
