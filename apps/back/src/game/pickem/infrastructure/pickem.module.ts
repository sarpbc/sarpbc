import { EntityManager } from "@mikro-orm/postgresql";
import { Logger, Module } from "@nestjs/common";
import { v4 } from "uuid";
import { MikroPickemStore } from "./persistence/pickem.store";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PickemChoice } from "./persistence/pickem.entity";
import { PickemController } from "./http/pickem.controller";
import { PickemService } from "../application/pickem.service";
import { MatchDecidedListener } from "./match-decided.listener";
import { CompetitionPickemMatches } from "./competition-pickem-matches";
import { MatchService } from "../../../tournament/application/match/match.service";
import { TournamentModule } from "../../../tournament/infrastructure/tournament.module";

@Module({
  controllers: [PickemController],
  exports: [PickemService],
  imports: [MikroOrmModule.forFeature([PickemChoice]), TournamentModule],
  providers: [
    {
      inject: [EntityManager, MatchService],
      provide: PickemService,
      useFactory: (em: EntityManager, matches: MatchService) => {
        const store = new MikroPickemStore(em);
        const logger = new Logger(PickemService.name);

        return new PickemService(store, new CompetitionPickemMatches(matches), store, {
          id: v4,
          now: () => new Date(),
          warn: (message) => {
            logger.warn(message);
          },
        });
      },
    },
    MatchDecidedListener,
  ],
})
export class PickemModule {}
