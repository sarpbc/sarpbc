import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MikroORM } from "@mikro-orm/core";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";
import { AirRiddleService } from "../application/airriddle.service";
import { RIDDLE_TIME_ZONE } from "./riddle-time-zone";

@Injectable()
export class AirRiddleJob {
  constructor(
    private readonly service: AirRiddleService,
    private readonly orm: MikroORM,
  ) {}
  @Cron("0 0 * * *", { timeZone: RIDDLE_TIME_ZONE })
  @CreateRequestContext()
  async createAirRiddle(): Promise<void> {
    await this.service.createAirRiddle();
  }
}
