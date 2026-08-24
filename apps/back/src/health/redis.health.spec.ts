import { HealthIndicatorService } from "@nestjs/terminus";
import { RedisService } from "../redis/redis.service";
import { RedisHealthIndicator } from "./redis.health";

describe("RedisHealthIndicator", () => {
  const up = jest.fn().mockReturnValue({ redis: { status: "up" } });
  const down = jest.fn().mockReturnValue({ redis: { status: "down" } });
  const healthIndicatorService = {
    check: jest.fn().mockReturnValue({ up, down }),
  };
  const redis = {
    ping: jest.fn(),
  };

  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    jest.clearAllMocks();
    healthIndicatorService.check.mockReturnValue({ up, down });
    indicator = new RedisHealthIndicator(
      redis as unknown as RedisService,
      healthIndicatorService as unknown as HealthIndicatorService,
    );
  });

  it("is up when ping returns PONG", async () => {
    redis.ping.mockResolvedValue("PONG");

    await expect(indicator.pingCheck("redis")).resolves.toEqual({ redis: { status: "up" } });
    expect(up).toHaveBeenCalled();
  });

  it("is down when ping returns an unexpected value", async () => {
    redis.ping.mockResolvedValue("NOPE");

    await expect(indicator.pingCheck("redis")).resolves.toEqual({ redis: { status: "down" } });
    expect(down).toHaveBeenCalledWith({ message: "Unexpected ping response" });
  });

  it("is down when ping throws", async () => {
    redis.ping.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(indicator.pingCheck("redis")).resolves.toEqual({ redis: { status: "down" } });
    expect(down).toHaveBeenCalledWith({ message: "ECONNREFUSED" });
  });
});
