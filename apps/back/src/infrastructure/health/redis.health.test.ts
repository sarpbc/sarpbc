import { ConfigService } from "@nestjs/config";
import { HealthIndicatorService } from "@nestjs/terminus";
import { describe, expect, it } from "vitest";
import { RedisService } from "../redis/redis.service";
import { RedisHealthIndicator } from "./redis.health";

class PingingRedisService extends RedisService {
  constructor(private readonly reply: () => Promise<string>) {
    super(new ConfigService(), () => {
      throw new Error("Redis client is not available");
    });
  }

  override async ping() {
    return await this.reply();
  }
}

const indicatorFor = (reply: () => Promise<string>) =>
  new RedisHealthIndicator(new PingingRedisService(reply), new HealthIndicatorService());

describe(RedisHealthIndicator, () => {
  it("is up when ping returns PONG", async () => {
    const indicator = indicatorFor(async () => await Promise.resolve("PONG"));

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({ redis: { status: "up" } });
  });

  it("is down when ping returns an unexpected value", async () => {
    const indicator = indicatorFor(async () => await Promise.resolve("NOPE"));

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({
      redis: { message: "Unexpected ping response", status: "down" },
    });
  });

  it("is down when ping throws", async () => {
    const indicator = indicatorFor(async () => await Promise.reject(new Error("ECONNREFUSED")));

    await expect(indicator.pingCheck("redis")).resolves.toStrictEqual({
      redis: { message: "ECONNREFUSED", status: "down" },
    });
  });
});
