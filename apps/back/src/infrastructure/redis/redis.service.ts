import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Redis, RedisOptions } from "ioredis";
import { log } from "evlog";

const SET_WHILE_HELD_SCRIPT = `if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
  return 1
end
return 0`;

export type RedisClientFactory = (options: RedisOptions) => Redis;

export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly createClient: RedisClientFactory,
  ) {}

  onModuleInit() {
    this.client = this.createClient({
      host: this.configService.get<string>("redis.host"),
      port: this.configService.get<number>("redis.port"),
      password: this.configService.get<string>("redis.password"),
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
    return await this.client.ping();
  }

  async set(key: string, value: string, ttlInSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlInSeconds);
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
    return await this.client.get(key);
  }

  async delete(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const deleteFrom = async (cursor: string): Promise<number> => {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100,
      );

      const deleted = keys.length > 0 ? await this.client.del(keys) : 0;

      return nextCursor === "0" ? deleted : deleted + (await deleteFrom(nextCursor));
    };

    return await deleteFrom("0");
  }
}
