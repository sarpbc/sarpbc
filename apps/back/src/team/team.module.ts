import { Module, forwardRef, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";
import { Team } from "./domain/team.entity";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PlayerModule } from "../player/player.module";
import { UserModule } from "src/user/user.module";
import { PandascoreModule } from "src/pandascore/pandascore.module";
import { SyncPandascoreTeamsUseCase } from "./sync/sync-pandascore-teams.use-case";

@Module({
  imports: [
    MikroOrmModule.forFeature([Team]),
    forwardRef(() => PlayerModule),
    UserModule,
    PandascoreModule,
    ConfigModule,
  ],
  controllers: [TeamController],
  providers: [TeamService, SyncPandascoreTeamsUseCase],
  exports: [TeamService],
})
export class TeamModule implements OnModuleInit {
  constructor(
    private readonly teamService: TeamService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.configService.get<boolean>("pandascore_sync_on_boot")) {
      this.teamService.initializeTeamsFromPandaScore(true).catch((error) => {
        console.error("Failed to initialize teams on module init:", error);
      });
    }
  }
}
