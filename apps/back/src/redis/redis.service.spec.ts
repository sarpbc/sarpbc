import { RedisService } from "./redis.service";
import { ConfigService } from "@nestjs/config";

const mockRedisClient = {
  quit: jest.fn().mockResolvedValue("OK"),
  on: jest.fn(),
  ping: jest.fn().mockResolvedValue("PONG"),
};

jest.mock("ioredis", () => ({
  Redis: jest.fn(() => mockRedisClient),
}));

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    service = new RedisService({
      get: jest.fn((key: string) => {
        switch (key) {
          case "redis.host":
            return "redis";
          case "redis.port":
            return 6379;
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService);
    jest.clearAllMocks();
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
