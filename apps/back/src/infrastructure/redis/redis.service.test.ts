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
    service = new RedisService({
      get: vi.fn((key: string) => {
        switch (key) {
          case "redis.host":
            return "redis";
          case "redis.port":
            return 6379;
          default:
            return undefined;
        }
      }),
    } as never);
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
