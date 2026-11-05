import { Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { log } from "evlog";
import type { StatsImportScheduler } from "../application/ports";
import { StatsImportService } from "../application/stats-import.service";

/**
 * The repository has no job queue, so an import runs in this process after the request returns.
 * Its status lives in PostgreSQL; an import cut short by a restart is marked failed at boot.
 */
@Injectable()
export class StatsImportRunner implements StatsImportScheduler, OnApplicationBootstrap {
  constructor(
    private readonly orm: MikroORM,
    // The service schedules through this runner, so it is resolved lazily to avoid a cycle.
    private readonly moduleRef: ModuleRef,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const service = this.moduleRef.get(StatsImportService);
    const interrupted = await RequestContext.create(this.orm.em, () => service.failInterrupted());
    if (interrupted > 0)
      log.warn({
        component: StatsImportRunner.name,
        message: "Interrupted stats imports",
        interrupted,
      });
  }

  schedule(task: () => Promise<void>): void {
    setImmediate(() => {
      RequestContext.create(this.orm.em, task).catch((error) =>
        log.error({
          component: StatsImportRunner.name,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
      );
    });
  }
}
