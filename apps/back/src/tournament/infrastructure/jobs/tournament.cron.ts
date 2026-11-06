import { MAX_PAGE_SIZE } from "@sarpbc/utils";
import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MikroORM } from "@mikro-orm/postgresql";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { createLogger } from "evlog";
import { SyncNewTournamentsUseCase } from "../../application/sync/sync-new-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "../../application/sync/sync-pandascore-tournament.use-case";
import { MatchService } from "../../application/match/match.service";
import type { TournamentQueries } from "../../application/ports";
import { TOURNAMENT_QUERIES } from "../competition-queries.tokens";

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class TournamentCron {
  constructor(
    private readonly orm: MikroORM,
    private readonly syncNewTournamentsUseCase: SyncNewTournamentsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly matchService: MatchService,
    @Inject(TOURNAMENT_QUERIES) private readonly tournaments: TournamentQueries,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @CreateRequestContext()
  async syncActiveTournaments() {
    const log = createLogger({
      component: TournamentCron.name,
      job: "syncActiveTournaments",
    });

    try {
      const [liveMatches] = await this.matchService.list("live", { limit: MAX_PAGE_SIZE });

      const recentlyEndedMatches = await this.matchService.findRecentlyEnded();

      const activeTournamentIds = await this.findPandascoreActiveIds(new Date());

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

  private async findPandascoreActiveIds(now: Date): Promise<string[]> {
    return (
      await this.tournaments.findPandascoreActive({
        beginsBefore: new Date(now.getTime() + 24 * HOUR_MS),
        beganAfter: new Date(now.getTime() - 7 * 24 * HOUR_MS),
        endsAfter: new Date(now.getTime() - 6 * HOUR_MS),
      })
    ).map((t) => t.id);
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
