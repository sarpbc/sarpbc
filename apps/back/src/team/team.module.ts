import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";
import { TeamPersistenceModule } from "./team-persistence.module";
import { PlayerModule } from "../player/player.module";
import { UserModule } from "src/user/user.module";
import { PandascoreModule } from "src/pandascore/pandascore.module";
import { TournamentModule } from "src/tournament/tournament.module";
import { SyncPandascoreTeamsUseCase } from "./sync/sync-pandascore-teams.use-case";
import { log } from "evlog";

@Module({
  imports: [
    TeamPersistenceModule,
    PlayerModule,
    TournamentModule,
    UserModule,
    PandascoreModule,
    ConfigModule,
  ],
  controllers: [TeamController],
  providers: [TeamService, SyncPandascoreTeamsUseCase],
  exports: [TeamService, TeamPersistenceModule],
})
export class TeamModule implements OnModuleInit {
  constructor(
    private readonly teamService: TeamService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.teamService.initializeTeamsFromPandaScore(true).catch((error) => {
        log.error({
          component: TeamModule.name,
          job: "module_init",
          message: "Failed to initialize teams on module init",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
    }
  }
}
