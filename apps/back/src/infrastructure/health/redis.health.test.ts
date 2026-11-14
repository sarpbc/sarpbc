import { HealthIndicatorService } from "@nestjs/terminus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unconstructed } from "../../../test/doubles";
import { RedisService } from "../redis/redis.service";
import { RedisHealthIndicator } from "./redis.health";

describe(RedisHealthIndicator, () => {
  const ping = vi.fn<RedisService["ping"]>();
  const redis = Object.assign(unconstructed(RedisService), { ping });

  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    vi.clearAllMocks();
    indicator = new RedisHealthIndicator(redis, new HealthIndicatorService());
  });

  it("is up when ping returns PONG", async () => {
    ping.mockResolvedValue("PONG");

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({ redis: { status: "up" } });
  });

  it("is down when ping returns an unexpected value", async () => {
    ping.mockResolvedValue("NOPE");

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({
      redis: { status: "down", message: "Unexpected ping response" },
    });
  });

  it("is down when ping throws", async () => {
    ping.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({
      redis: { status: "down", message: "ECONNREFUSED" },
    });
  });
});
