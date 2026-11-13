import { Module } from "@nestjs/common";
import { PlayerComparisonService } from "../application/player-comparison.service";
import { ContractService } from "../../roster/application/contract.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { SeasonService } from "../../season/application/season.service";
import { SeasonModule } from "../../season/infrastructure/season.module";
import { MatchService } from "../../tournament/application/match/match.service";
import { PlayerAwardService } from "../../tournament/application/player-award.service";
import type { TournamentQueries } from "../../tournament/application/ports";
import { TournamentPrizeService } from "../../tournament/application/tournament-prize.service";
import { TOURNAMENT_QUERIES } from "../../tournament/infrastructure/competition-queries.tokens";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { PlayerComparisonController } from "./http/player-comparison.controller";

@Module({
  imports: [RosterModule, TournamentModule, SeasonModule],
  controllers: [PlayerComparisonController],
  providers: [
    {
      provide: PlayerComparisonService,
      useFactory: (
        players: PlayerService,
        contracts: ContractService,
        tournaments: TournamentQueries,
        matches: MatchService,
        prizes: TournamentPrizeService,
        awards: PlayerAwardService,
        seasons: SeasonService,
      ) =>
        new PlayerComparisonService({
          players,
          contracts,
          tournaments,
          matches,
          prizes,
          awards,
          seasons,
        }),
      inject: [
        PlayerService,
        ContractService,
        TOURNAMENT_QUERIES,
        MatchService,
        TournamentPrizeService,
        PlayerAwardService,
        SeasonService,
      ],
    },
  ],
})
export class CareerModule {}
