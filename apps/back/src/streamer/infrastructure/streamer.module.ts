import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { log } from "evlog";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { UserModule } from "../../user/infrastructure/user.module";
import { StreamerService } from "../application/streamer.service";
import { RedisLiveStreamCache } from "./cache/redis-live-stream-cache";
import { StreamerController } from "./http/streamer.controller";
import { TwitchStreamer } from "./persistence/twitch-streamer.entity";
import { TwitchStreamerRepository } from "./persistence/twitch-streamer.repository";
import { createTwitchSource } from "./twitch/create-twitch-source";

@Module({
  imports: [MikroOrmModule.forFeature([TwitchStreamer]), RedisModule, UserModule],
  controllers: [StreamerController],
  providers: [
    TwitchStreamerRepository,
    {
      provide: StreamerService,
      useFactory: (
        streamers: TwitchStreamerRepository,
        redis: RedisService,
        config: ConfigService,
      ) =>
        new StreamerService(
          streamers,
          createTwitchSource(
            config.get<string>("twitch.clientId"),
            config.get<string>("twitch.clientSecret"),
          ),
          new RedisLiveStreamCache(redis),
          (operation, error) =>
            log.warn({
              component: StreamerService.name,
              message: "Live streamers degraded",
              operation,
              error: error instanceof Error ? error : new Error(String(error)),
            }),
        ),
      inject: [TwitchStreamerRepository, RedisService, ConfigService],
    },
  ],
})
export class StreamerModule {}
