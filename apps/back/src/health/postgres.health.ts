import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { HealthIndicatorService } from "@nestjs/terminus";
import { HEALTH_PING_TIMEOUT_MS } from "./health.constants";
import { withTimeout } from "./with-timeout";

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    private readonly em: EntityManager,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await withTimeout(
        this.em.getConnection().execute("SELECT 1"),
        HEALTH_PING_TIMEOUT_MS,
        "Postgres ping timed out",
      );
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
