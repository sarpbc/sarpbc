import { Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { log } from "evlog";
import { StatsImportService } from "../application/stats-import.service";

/**
 * The repository has no job queue, so an import runs in this process after the request returns.
 * Its status lives in PostgreSQL; an import cut short by a restart is marked failed at boot.
 */
@Injectable()
export class StatsImportRunner implements OnApplicationBootstrap {
  constructor(
    private readonly orm: MikroORM,
    private readonly service: StatsImportService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const interrupted = await RequestContext.create(this.orm.em, () =>
      this.service.failInterrupted(),
    );
    if (interrupted > 0)
      log.warn({
        component: StatsImportRunner.name,
        message: "Interrupted stats imports",
        interrupted,
      });
  }

  start(importId: string): void {
    setImmediate(() => {
      RequestContext.create(this.orm.em, () => this.service.run(importId)).catch((error) =>
        log.error({
          component: StatsImportRunner.name,
          importId,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
      );
    });
  }
}
