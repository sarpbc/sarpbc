import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TournamentService } from "./tournament.service";
import { CreateRequestContext, MikroORM } from "@mikro-orm/postgresql";
import { MatchService } from "./match/match.service";

@Injectable()
export class TournamentCron {
  private readonly logger = new Logger(TournamentCron.name);

  constructor(
    private readonly orm: MikroORM, // Injected to make the Cron work
    private readonly tournamentService: TournamentService,
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

      // Find recently ended matches (last 15 minutes) to capture final scores
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

      // Get unique tournament IDs from live and recently ended matches
      const tournamentIds = new Set<string>();
      for (const match of allMatches) {
        if (match.tournament?.id) {
          tournamentIds.add(match.tournament.id);
        }
      }

      this.logger.log(
        `Found ${tournamentIds.size} tournaments with live or recently ended matches`,
      );

      // Sync each tournament with live matches
      for (const tournamentId of tournamentIds) {
        try {
          await this.tournamentService.syncTournamentFromPandascore(tournamentId);
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
  async syncAllTournamentsDaily() {
    this.logger.log("Starting daily sync of all tournaments at midnight...");

    try {
      await this.tournamentService.syncAllTournaments();
      this.logger.log("Successfully completed daily tournament sync");
    } catch (error) {
      this.logger.error("Failed to sync tournaments daily", error);
    }
  }
}
