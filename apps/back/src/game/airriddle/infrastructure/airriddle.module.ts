import { EntityManager } from "@mikro-orm/postgresql";
import { v4 } from "uuid";
import { DateTime } from "luxon";
import { log } from "evlog";
import { PlayerService } from "../../../roster/application/player.service";
import { MikroDailyRiddles } from "./persistence/airriddle.store";
import { AirRiddleJob } from "./airriddle.job";
import { RIDDLE_TIME_ZONE } from "./riddle-time-zone";
import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { AirRiddle } from "./persistence/airriddle.entity";
import { AirRiddleController } from "./http/airriddle.controller";
import { AirRiddleService } from "../application/airriddle.service";
import { RosterModule } from "../../../roster/infrastructure/roster.module";

@Module({
  controllers: [AirRiddleController],
  exports: [AirRiddleService],
  imports: [MikroOrmModule.forFeature([AirRiddle]), RosterModule],
  providers: [
    AirRiddleJob,
    {
      inject: [EntityManager, PlayerService],
      provide: AirRiddleService,
      useFactory: (em: EntityManager, players: PlayerService) =>
        new AirRiddleService(new MikroDailyRiddles(em), players, {
          dayStart: () => DateTime.now().setZone(RIDDLE_TIME_ZONE).startOf("day").toJSDate(),
          error: (error) => {
            log.error({ component: "AirRiddleService", error });
          },
          id: v4,
          now: () => new Date(),
          skipped: () => {
            log.info({ component: "AirRiddleService", reason: "no_player", skipped: true });
          },
        }),
    },
  ],
})
export class AirRiddleModule {}
