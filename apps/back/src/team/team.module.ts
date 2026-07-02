import { Module, forwardRef, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";
import { Team } from "../player/player.entities";
import { TeamRepository } from "./team.repository";
import { TEAM_REPOSITORY } from "./domain/team.repository.interface";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PlayerModule } from "../player/player.module";
import { UserModule } from "src/user/user.module";
import { PandascoreModule } from "src/pandascore/pandascore.module";
import { SyncPandascoreTeamsUseCase } from "./sync/sync-pandascore-teams.use-case";
import { log } from "evlog";

@Module({
  imports: [
    MikroOrmModule.forFeature([Team]),
    forwardRef(() => PlayerModule),
    UserModule,
    PandascoreModule,
    ConfigModule,
  ],
  controllers: [TeamController],
  providers: [
    TeamService,
    SyncPandascoreTeamsUseCase,
    {
      provide: TEAM_REPOSITORY,
      useExisting: TeamRepository,
    },
  ],
  exports: [TeamService, TEAM_REPOSITORY],
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
