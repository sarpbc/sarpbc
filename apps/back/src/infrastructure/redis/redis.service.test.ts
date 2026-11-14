import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  const client = new Redis({ lazyConnect: true });
  const quit = vi.spyOn(client, "quit").mockResolvedValue("OK");
  const on = vi.spyOn(client, "on");
  const ping = vi.spyOn(client, "ping").mockResolvedValue("PONG");

  let service: RedisService;

  beforeEach(() => {
    service = new RedisService(
      new ConfigService({ redis: { host: "redis", port: 6379 } }),
      () => client,
    );
    vi.clearAllMocks();
    service.onModuleInit();
  });

  it("attaches an error listener on init", () => {
    expect(on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("awaits quit on module destroy", async () => {
    await service.onModuleDestroy();
    expect(quit).toHaveBeenCalled();
  });

  it("pings the redis client", async () => {
    await expect(service.ping()).resolves.toBe("PONG");
    expect(ping).toHaveBeenCalled();
  });
});
