import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreateRequestContext, MikroORM } from "@mikro-orm/postgresql";
import { createLogger } from "evlog";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { MatchService } from "./match/match.service";

@Injectable()
export class TournamentCron {
  constructor(
    private readonly orm: MikroORM,
    private readonly syncPandascoreAdditionsUseCase: SyncPandascoreAdditionsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly matchService: MatchService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @CreateRequestContext()
  async syncLiveTournaments() {
    const log = createLogger({
      component: TournamentCron.name,
      job: "syncLiveTournaments",
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

      const allMatches = [...liveMatches, ...recentlyEndedMatches];

      if (allMatches.length === 0) {
        log.set({ matches: { live: 0, recentlyEnded: 0, tournaments: 0 } });
        return;
      }

      const tournamentIds = new Set<string>();
      for (const match of allMatches) {
        if (match.tournament?.id) {
          tournamentIds.add(match.tournament.id);
        }
      }

      log.set({
        matches: {
          live: liveMatches.length,
          recentlyEnded: recentlyEndedMatches.length,
          tournaments: tournamentIds.size,
        },
      });

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
      await this.syncPandascoreAdditionsUseCase.execute();
      log.set({ jobStatus: "completed" });
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
    } finally {
      log.emit();
    }
  }
}
