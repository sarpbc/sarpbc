import { Injectable } from "@nestjs/common";
import type { OnApplicationBootstrap } from "@nestjs/common";
import type { MikroORM } from "@mikro-orm/core";
import { RequestContext } from "@mikro-orm/core";
import { log } from "evlog";
import type { StatsImportService } from "../application/stats-import.service";

/** Status lives in PostgreSQL; an import cut short by a restart is marked failed at boot. */
@Injectable()
export class InterruptedImportsSweeper implements OnApplicationBootstrap {
  constructor(
    private readonly orm: MikroORM,
    private readonly imports: StatsImportService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const interrupted = await RequestContext.create(
      this.orm.em,
      async () => await this.imports.failInterrupted(),
    );

    if (interrupted > 0) {
      log.warn({
        component: InterruptedImportsSweeper.name,
        message: "Interrupted stats imports",
        interrupted,
      });
    }
  }
}
