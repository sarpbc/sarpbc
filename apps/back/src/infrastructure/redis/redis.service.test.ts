import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

const mockRedisClient = vi.hoisted(() => ({
  quit: vi.fn().mockResolvedValue("OK"),
  on: vi.fn(),
  ping: vi.fn().mockResolvedValue("PONG"),
}));

vi.mock("ioredis", () => ({
  Redis: vi.fn(function () {
    return mockRedisClient;
  }),
}));

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    service = new RedisService(new ConfigService({ redis: { host: "redis", port: 6379 } }));
    vi.clearAllMocks();
    service.onModuleInit();
  });

  it("attaches an error listener on init", () => {
    expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("awaits quit on module destroy", async () => {
    await service.onModuleDestroy();
    expect(mockRedisClient.quit).toHaveBeenCalled();
  });

  it("pings the redis client", async () => {
    await expect(service.ping()).resolves.toBe("PONG");
    expect(mockRedisClient.ping).toHaveBeenCalled();
  });
});
