import { Module, forwardRef, OnModuleInit } from "@nestjs/common";
import { TeamController } from "./team.controller";
import { TeamService } from "./team.service";
import { Team } from "./domain/team.entity";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PlayerModule } from "../player/player.module";
import { UserModule } from "src/user/user.module";
import { PandascoreModule } from "src/pandascore/pandascore.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([Team]),
    forwardRef(() => PlayerModule),
    UserModule,
    PandascoreModule,
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule implements OnModuleInit {
  constructor(private readonly teamService: TeamService) {}

  onModuleInit() {
    this.teamService.initializeTeamsFromPandaScore(true).catch((error) => {
      console.error("Failed to initialize teams on module init:", error);
    });
  }
}
