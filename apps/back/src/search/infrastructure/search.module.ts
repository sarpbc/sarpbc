import { PlayerService } from "../../roster/application/player.service";
import { TeamService } from "../../roster/application/team.service";
import type { TournamentQueries } from "../../tournament/application/public";
import { TOURNAMENT_QUERIES } from "../../tournament/infrastructure/competition-queries.tokens";
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
      useFactory: (players: PlayerService, teams: TeamService, tournaments: TournamentQueries) =>
        new SearchService(players, teams, tournaments),
      inject: [PlayerService, TeamService, TOURNAMENT_QUERIES],
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
