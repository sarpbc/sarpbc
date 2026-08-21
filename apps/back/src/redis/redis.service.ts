import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as Redis from "ioredis";
import { env } from "process";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis.Redis;

  onModuleInit() {
    this.client = new Redis.Redis({
      host: env.REDIS_HOST || "redis",
      port: parseInt(env.REDIS_PORT || "6379", 10),
      password: env.REDIS_PASSWORD || undefined,
    });

    this.client.on("error", (error: Error) => {
      this.logger.error("Redis connection error", error.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async set(key: string, otp: string, ttlInSeconds: number): Promise<void> {
    await this.client.set(key, otp, "EX", ttlInSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let cursor = "0";
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100,
      );

      if (keys.length > 0) {
        deleted += await this.client.del(keys);
      }

      cursor = nextCursor;
    } while (cursor !== "0");

    return deleted;
  }
}
