import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { PANDASCORE_GATEWAY } from "../application/ports/pandascore.gateway.port";
import { SYNC_CURSOR_REPOSITORY } from "../domain/sync-cursor.repository.interface";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreGatewayImpl } from "./pandascore.gateway";
import { RedisSyncCursorRepository } from "./redis-sync-cursor.repository";

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    PandascoreApiClient,
    PandascoreGatewayImpl,
    {
      provide: PANDASCORE_GATEWAY,
      useExisting: PandascoreGatewayImpl,
    },
    {
      provide: SYNC_CURSOR_REPOSITORY,
      useClass: RedisSyncCursorRepository,
    },
  ],
  exports: [PandascoreApiClient, PandascoreGatewayImpl, PANDASCORE_GATEWAY, SYNC_CURSOR_REPOSITORY],
})
export class PandascoreModule {}
