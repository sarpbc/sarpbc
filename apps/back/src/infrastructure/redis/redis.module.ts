import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisService } from "./redis.service";

@Module({
  exports: [RedisService],
  providers: [
    {
      inject: [ConfigService],
      provide: RedisService,
      useFactory: (config: ConfigService) =>
        new RedisService(config, (options) => new Redis(options)),
    },
  ],
})
export class RedisModule {}
