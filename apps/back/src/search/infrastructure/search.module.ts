import { PlayerService } from "../../player/application/player.service";
import { TeamService } from "../../team/application/team.service";
import { TournamentService } from "../../tournament/application/tournament.service";
import { Module } from "@nestjs/common";
import { SearchController } from "./http/search.controller";
import { SearchService } from "../application/search.service";
import { PlayerModule } from "../../player/infrastructure/player.module";
import { TeamModule } from "../../team/infrastructure/team.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";

@Module({
  imports: [PlayerModule, TeamModule, TournamentModule],
  controllers: [SearchController],
  providers: [
    {
      provide: SearchService,
      useFactory: (players: PlayerService, teams: TeamService, tournaments: TournamentService) =>
        new SearchService(players, teams, tournaments),
      inject: [PlayerService, TeamService, TournamentService],
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
