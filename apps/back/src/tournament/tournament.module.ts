import { Module, OnModuleInit, forwardRef } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Tournament } from "./domain/tournament.entity";
import { Match } from "./match/match.entity";
import { TournamentParticipant } from "./domain/tournament-participant.entity";
import { League } from "./league/league.entity";
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

@Module({
  imports: [
    MikroOrmModule.forFeature([Tournament, Match, TournamentParticipant, League]),
    forwardRef(() => TeamModule),
    forwardRef(() => PlayerModule),
    UserModule,
    PandascoreModule,
    RedisModule,
  ],
  controllers: [TournamentController, MatchController],
  providers: [TournamentService, MatchService, LeagueService, TournamentCron],
  exports: [TournamentService, MatchService, LeagueService],
})
export class TournamentModule implements OnModuleInit {
  constructor(private readonly tournamentService: TournamentService) {}

  onModuleInit() {
    this.tournamentService.syncAllTournaments().catch((error) => {
      console.error("Failed to sync tournaments on module init:", error);
    });
  }
}
