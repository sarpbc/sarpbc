import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { DateTime } from "luxon";
import { log } from "evlog";
import { PlayerService } from "../../../player/application/player.service";
import { MikroDailyRiddles } from "./persistence/airriddle.store";
import { AirRiddleJob } from "./airriddle.job";
import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { AirRiddle } from "./persistence/airriddle.entity";
import { AirRiddleController } from "./http/airriddle.controller";
import { AirRiddleService } from "../application/airriddle.service";
import { PlayerModule } from "../../../player/infrastructure/player.module";

@Module({
  imports: [MikroOrmModule.forFeature([AirRiddle]), PlayerModule],
  controllers: [AirRiddleController],
  providers: [
    AirRiddleJob,
    {
      provide: AirRiddleService,
      useFactory: (em: EntityManager, players: PlayerService) =>
        new AirRiddleService(new MikroDailyRiddles(em), players, {
          dayStart: () => DateTime.now().setZone("Europe/Berlin").startOf("day").toJSDate(),
          now: () => new Date(),
          id: v4,
          skipped: (reason) => log.info({ component: "AirRiddleService", skipped: true, reason }),
          error: (error) => log.error({ component: "AirRiddleService", error }),
        }),
      inject: [EntityManager, PlayerService],
    },
  ],
  exports: [AirRiddleService],
})
export class AirRiddleModule {}
