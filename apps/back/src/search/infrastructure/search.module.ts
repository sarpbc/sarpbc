import { PlayerService } from "../../roster/application/player.service";
import { TeamService } from "../../roster/application/team.service";
import { TournamentService } from "../../tournament/application/tournament.service";
import { Module } from "@nestjs/common";
import { SearchController } from "./http/search.controller";
import { SearchService } from "../application/search.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";

@Module({
  imports: [RosterModule, TournamentModule],
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
