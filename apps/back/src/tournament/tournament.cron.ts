import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CreateRequestContext, MikroORM } from "@mikro-orm/postgresql";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { MatchService } from "./match/match.service";

@Injectable()
export class TournamentCron {
  private readonly logger = new Logger(TournamentCron.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly syncPandascoreAdditionsUseCase: SyncPandascoreAdditionsUseCase,
    private readonly syncPandascoreTournamentUseCase: SyncPandascoreTournamentUseCase,
    private readonly matchService: MatchService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @CreateRequestContext()
  async syncLiveTournaments() {
    this.logger.log("Starting sync of live tournaments and matches...");

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
        this.logger.log("No live or recently ended matches found");
        return;
      }

      this.logger.log(
        `Found ${liveMatches.length} live matches and ${recentlyEndedMatches.length} recently ended matches`,
      );

      const tournamentIds = new Set<string>();
      for (const match of allMatches) {
        if (match.tournament?.id) {
          tournamentIds.add(match.tournament.id);
        }
      }

      this.logger.log(
        `Found ${tournamentIds.size} tournaments with live or recently ended matches`,
      );

      for (const tournamentId of tournamentIds) {
        try {
          await this.syncPandascoreTournamentUseCase.execute(tournamentId);
          this.logger.log(`Successfully synced tournament ${tournamentId}`);
        } catch (error) {
          this.logger.error(`Failed to sync tournament ${tournamentId}`, error);
        }
      }

      this.logger.log("Finished syncing live tournaments and matches");
    } catch (error) {
      this.logger.error("Failed to sync live tournaments", error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @CreateRequestContext()
  async syncPandascoreAdditionsDaily() {
    this.logger.log("Starting daily incremental PandaScore additions sync...");

    try {
      await this.syncPandascoreAdditionsUseCase.execute();
      this.logger.log("Successfully completed daily PandaScore additions sync");
    } catch (error) {
      this.logger.error("Failed to sync PandaScore additions daily", error);
    }
  }
}
