import { Module } from "@nestjs/common";
import { CountryService } from "../application/country.service";
import { PlayerService } from "../../roster/application/player.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import { MatchService } from "../../tournament/application/match/match.service";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { CountryController } from "./http/country.controller";

@Module({
  imports: [RosterModule, TournamentModule],
  controllers: [CountryController],
  providers: [
    {
      provide: CountryService,
      useFactory: (players: PlayerService, matches: MatchService) =>
        new CountryService({ players, matches }),
      inject: [PlayerService, MatchService],
    },
  ],
})
export class CountryModule {}
