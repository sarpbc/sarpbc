import { RedisService } from "./redis.service";

const mockRedisClient = {
  quit: jest.fn().mockResolvedValue("OK"),
  on: jest.fn(),
};

jest.mock("ioredis", () => ({
  Redis: jest.fn(() => mockRedisClient),
}));

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    service = new RedisService();
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
});
