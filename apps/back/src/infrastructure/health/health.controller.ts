import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import type { HealthCheckService } from "@nestjs/terminus";
import { HealthCheck } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import type { PostgresHealthIndicator } from "./postgres.health";
import type { RedisHealthIndicator } from "./redis.health";
import type { ShutdownStateService } from "./shutdown-state.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly shutdownState: ShutdownStateService,
  ) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @HealthCheck()
  async ready() {
    if (this.shutdownState.isShuttingDown()) {
      throw new ServiceUnavailableException("Shutting down");
    }

    return await this.health.check([
      async () => await this.postgres.pingCheck("postgres"),
      async () => await this.redis.pingCheck("redis"),
    ]);
  }
}
