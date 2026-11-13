import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { TransferService } from "../../roster/application/transfer.service";
import { RosterModule } from "../../roster/infrastructure/roster.module";
import type { TournamentQueries } from "../../tournament/application/ports";
import { TOURNAMENT_QUERIES } from "../../tournament/infrastructure/competition-queries.tokens";
import { TournamentModule } from "../../tournament/infrastructure/tournament.module";
import { OnThisDayFactService } from "../application/on-this-day-fact.service";
import { OnThisDayService } from "../application/on-this-day.service";
import { OnThisDayFactController } from "./http/on-this-day-fact.controller";
import { OnThisDayController } from "./http/on-this-day.controller";
import { OnThisDayFactPersistence } from "./persistence/on-this-day-fact.store";

@Module({
  imports: [RosterModule, TournamentModule],
  controllers: [OnThisDayController, OnThisDayFactController],
  providers: [
    {
      provide: OnThisDayFactService,
      useFactory: (em: EntityManager) => new OnThisDayFactService(new OnThisDayFactPersistence(em)),
      inject: [EntityManager],
    },
    {
      provide: OnThisDayService,
      useFactory: (em: EntityManager, tournaments: TournamentQueries, transfers: TransferService) =>
        new OnThisDayService({
          tournaments,
          transfers,
          facts: new OnThisDayFactPersistence(em),
        }),
      inject: [EntityManager, TOURNAMENT_QUERIES, TransferService],
    },
  ],
})
export class OnThisDayModule {}
