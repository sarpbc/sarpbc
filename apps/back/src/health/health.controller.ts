import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";
import { ShutdownStateService } from "./shutdown-state.service";

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
  ready() {
    if (this.shutdownState.isShuttingDown()) {
      throw new ServiceUnavailableException("Shutting down");
    }

    return this.health.check([
      () => this.postgres.pingCheck("postgres"),
      () => this.redis.pingCheck("redis"),
    ]);
  }
}
