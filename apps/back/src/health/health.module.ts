import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { RedisModule } from "../redis/redis.module";
import { HealthController } from "./health.controller";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";
import { ShutdownStateService } from "./shutdown-state.service";

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, RedisHealthIndicator, ShutdownStateService],
})
export class HealthModule {}
