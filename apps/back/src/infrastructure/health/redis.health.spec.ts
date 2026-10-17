import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisHealthIndicator } from "./redis.health";

describe("RedisHealthIndicator", () => {
  const up = vi.fn().mockReturnValue({ redis: { status: "up" } });
  const down = vi.fn().mockReturnValue({ redis: { status: "down" } });
  const healthIndicatorService = {
    check: vi.fn().mockReturnValue({ up, down }),
  };
  const redis = {
    ping: vi.fn(),
  };

  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    vi.clearAllMocks();
    healthIndicatorService.check.mockReturnValue({ up, down });
    indicator = new RedisHealthIndicator(redis as never, healthIndicatorService as never);
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
