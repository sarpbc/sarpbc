import { Injectable } from "@nestjs/common";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { log } from "evlog";
import type { StatsImportScheduler } from "../application/ports";

// WARNING: no job queue; an import runs in this process after the request returns.
@Injectable()
export class StatsImportRunner implements StatsImportScheduler {
  constructor(private readonly orm: MikroORM) {}

  schedule(task: () => Promise<void>) {
    setImmediate(() => {
      void this.run(task);
    });
  }

  private async run(task: () => Promise<void>) {
    try {
      await RequestContext.create(this.orm.em, task);
    } catch (error) {
      log.error({
        component: StatsImportRunner.name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}
