import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
      password: this.configService.get<string>("redis.password"),
      port: this.configService.get<number>("redis.port"),
    });

    this.client.on("error", (error: Error) => {
      log.error({
        component: RedisService.name,
        error: error instanceof Error ? error : new Error(String(error)),
        message: "Redis connection error",
      });
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async ping() {
    const reply: string = await this.client.ping();

    return reply;
  }

  async set(key: string, value: string, ttlInSeconds: number) {
    await this.client.set(key, value, "EX", ttlInSeconds);
  }

  async setIfAbsent(key: string, value: string, ttlInSeconds: number) {
    return (await this.client.set(key, value, "EX", ttlInSeconds, "NX")) === "OK";
  }

  async setWhileHeld(
    lockKey: string,
    lockValue: string,
    key: string,
    value: string,
    ttlInSeconds: number,
  ) {
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

  async get(key: string) {
    return await this.client.get(key);
  }

  async delete(key: string) {
    return await this.client.del(key);
  }

  async deleteByPrefix(prefix: string) {
    const deleteFrom: (cursor: string) => Promise<number> = async (cursor) => {
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
