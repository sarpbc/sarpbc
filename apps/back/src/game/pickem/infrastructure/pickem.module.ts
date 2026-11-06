import { EntityManager } from "@mikro-orm/postgresql";
import { Logger } from "@nestjs/common";
import { v4 } from "uuid";
import { MikroPickemStore } from "./persistence/pickem.store";
import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./persistence/pickem.entity";
import { PickemController } from "./http/pickem.controller";
import { PickemService } from "../application/pickem.service";
import { MatchDecidedListener } from "./match-decided.listener";
import { CompetitionPickemMatches } from "./competition-pickem-matches";
import { MatchService } from "../../../tournament/application/match/match.service";
import { TournamentModule } from "../../../tournament/infrastructure/tournament.module";

@Module({
  imports: [MikroOrmModule.forFeature([PickemChoice]), TournamentModule],
  controllers: [PickemController],
  providers: [
    {
      provide: PickemService,
      useFactory: (em: EntityManager, matches: MatchService) => {
        const store = new MikroPickemStore(em);
        const logger = new Logger(PickemService.name);
        return new PickemService(store, new CompetitionPickemMatches(matches), store, {
          now: () => new Date(),
          id: v4,
          warn: (message) => logger.warn(message),
        });
      },
      inject: [EntityManager, MatchService],
    },
    MatchDecidedListener,
  ],
  exports: [PickemService],
})
export class PickemModule {}
