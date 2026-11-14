import { PlayerService } from "../../roster/application/player.service";
import { TeamService } from "../../roster/application/team.service";
import type { TournamentQueries } from "../../tournament/application/ports";
import { TOURNAMENT_QUERIES } from "../../tournament/infrastructure/competition-queries.tokens";
import { Module } from "@nestjs/common";
import { SearchController } from "./http/search.controller";
import { SearchService } from "../application/search.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";

@Module({
  controllers: [SearchController],
  exports: [SearchService],
  imports: [RosterModule, TournamentModule],
  providers: [
    {
      inject: [PlayerService, TeamService, TOURNAMENT_QUERIES],
      provide: SearchService,
      useFactory: (players: PlayerService, teams: TeamService, tournaments: TournamentQueries) =>
        new SearchService(players, teams, tournaments),
    },
  ],
})
export class SearchModule {}
