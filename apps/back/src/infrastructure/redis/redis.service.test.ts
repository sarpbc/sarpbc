import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { beforeEach, describe, expect, it } from "vitest";
import { RedisService } from "./redis.service";

class OfflineRedis extends Redis {
  quitCalls = 0;

  constructor() {
    super({ lazyConnect: true });
  }

  override async quit() {
    this.quitCalls += 1;

    return await Promise.resolve("OK" as const);
  }

  override async ping() {
    return await Promise.resolve("PONG" as const);
  }
}

describe(RedisService, () => {
  let client: OfflineRedis;
  let service: RedisService;

  beforeEach(() => {
    client = new OfflineRedis();
    service = new RedisService(
      new ConfigService({ redis: { host: "redis", port: 6379 } }),
      () => client,
    );
    service.onModuleInit();
  });

  it("survives a connection error after init", () => {
    expect(() => client.emit("error", new Error("ECONNREFUSED"))).not.toThrow();
  });

  it("quits the client on module destroy", async () => {
    await service.onModuleDestroy();
    expect(client.quitCalls).toBe(1);
  });

  it("pings the redis client", async () => {
    await expect(service.ping()).resolves.toBe("PONG");
  });
});
