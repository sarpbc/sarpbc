import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Redis from "ioredis";
import { log } from "evlog";

const SET_WHILE_HELD_SCRIPT = `if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
  return 1
end
return 0`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis.Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis.Redis({
      host: this.configService.get<string>("redis.host") || "redis",
      port: this.configService.get<number>("redis.port") ?? 6379,
      password: this.configService.get<string>("redis.password") || undefined,
    });

    this.client.on("error", (error: Error) => {
      log.error({
        component: RedisService.name,
        message: "Redis connection error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async set(key: string, otp: string, ttlInSeconds: number): Promise<void> {
    await this.client.set(key, otp, "EX", ttlInSeconds);
  }

  async setIfAbsent(key: string, value: string, ttlInSeconds: number): Promise<boolean> {
    return (await this.client.set(key, value, "EX", ttlInSeconds, "NX")) === "OK";
  }

  async setWhileHeld(
    lockKey: string,
    lockValue: string,
    key: string,
    value: string,
    ttlInSeconds: number,
  ): Promise<boolean> {
    const written = await this.client.eval(
      SET_WHILE_HELD_SCRIPT,
      2,
      lockKey,
      key,
      lockValue,
      value,
      ttlInSeconds,
    );
    return written === 1;
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
