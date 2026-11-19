import { Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { log } from "evlog";
import { StatsImportService } from "../application/stats-import.service";

@Injectable()
export class InterruptedImportsSweeper implements OnApplicationBootstrap {
  constructor(
    private readonly orm: MikroORM,
    private readonly imports: StatsImportService,
  ) {}

  async onApplicationBootstrap() {
    const interrupted = await RequestContext.create(
      this.orm.em,
      async () => await this.imports.failInterrupted(),
    );

    if (interrupted > 0) {
      log.warn({
        component: InterruptedImportsSweeper.name,
        interrupted,
        message: "Interrupted stats imports",
      });
    }
  }
}
