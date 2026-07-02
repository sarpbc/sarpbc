import { Module, OnModuleInit, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { League, Match, Tournament, TournamentParticipant } from "./tournament.entities";
import { TeamModule } from "../team/team.module";
import { PlayerModule } from "../player/player.module";
import { TournamentController } from "./tournament.controller";
import { TournamentService } from "./tournament.service";
import { UserModule } from "src/user/user.module";
import { RedisModule } from "src/redis/redis.module";
import { MatchController } from "./match/match.controller";
import { MatchService } from "./match/match.service";
import { LeagueService } from "./league/league.service";
import { PandascoreModule } from "src/pandascore/pandascore.module";
import { TournamentCron } from "./tournament.cron";
import { TournamentSyncPersistence } from "./sync/tournament-sync.persistence";
import { SyncAllTournamentsUseCase } from "./sync/sync-all-tournaments.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync/sync-pandascore-tournament.use-case";
import { SyncPandascoreAdditionsUseCase } from "./sync/sync-pandascore-additions.use-case";
import { log } from "evlog";

@Module({
  imports: [
    MikroOrmModule.forFeature([Tournament, Match, TournamentParticipant, League]),
    forwardRef(() => TeamModule),
    forwardRef(() => PlayerModule),
    UserModule,
    PandascoreModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [TournamentController, MatchController],
  providers: [
    TournamentService,
    MatchService,
    LeagueService,
    TournamentCron,
    TournamentSyncPersistence,
    SyncAllTournamentsUseCase,
    SyncPandascoreTournamentUseCase,
    SyncPandascoreAdditionsUseCase,
  ],
  exports: [TournamentService, MatchService, LeagueService],
})
export class TournamentModule implements OnModuleInit {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.tournamentService.syncAllTournaments().catch((error) => {
        log.error({
          component: TournamentModule.name,
          job: "module_init",
          message: "Failed to sync tournaments on module init",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    }
  }
}
