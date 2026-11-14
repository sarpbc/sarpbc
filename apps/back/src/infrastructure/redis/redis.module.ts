import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisService } from "./redis.service";

@Module({
  providers: [
    {
      provide: RedisService,
      useFactory: (config: ConfigService) =>
        new RedisService(config, (options) => new Redis(options)),
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
