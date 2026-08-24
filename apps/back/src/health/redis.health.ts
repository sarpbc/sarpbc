import { Injectable } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";
import { RedisService } from "../redis/redis.service";
import { HEALTH_PING_TIMEOUT_MS } from "./health.constants";
import { withTimeout } from "./with-timeout";

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const pong = await withTimeout(
        this.redis.ping(),
        HEALTH_PING_TIMEOUT_MS,
        "Redis ping timed out",
      );
      if (pong !== "PONG") {
        return indicator.down({ message: "Unexpected ping response" });
      }
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
