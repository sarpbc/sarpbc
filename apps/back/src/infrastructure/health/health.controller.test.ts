import { describe, expect, it } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HealthIndicatorService, TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";
import { ShutdownStateService } from "./shutdown-state.service";

class UpIndicator {
  constructor(private readonly indicators = new HealthIndicatorService()) {}

  async pingCheck(key: string) {
    return await Promise.resolve(this.indicators.check(key).up());
  }
}

const createController = async () => {
  const postgres = new UpIndicator();
  const redis = new UpIndicator();
  const shutdownState = new ShutdownStateService();

  const module = await Test.createTestingModule({
    controllers: [HealthController],
    imports: [TerminusModule],
    providers: [
      { provide: PostgresHealthIndicator, useValue: postgres },
      { provide: RedisHealthIndicator, useValue: redis },
      { provide: ShutdownStateService, useValue: shutdownState },
    ],
  }).compile();

  return { controller: module.get(HealthController), shutdownState };
};

describe(HealthController, () => {
  it("live reports that the process is up", async () => {
    const { controller } = await createController();

    expect(controller.live()).toStrictEqual({ status: "ok" });
  });

  it("ready reports postgres and redis as up", async () => {
    const { controller } = await createController();

    await expect(controller.ready()).resolves.toStrictEqual({
      details: { postgres: { status: "up" }, redis: { status: "up" } },
      error: {},
      info: { postgres: { status: "up" }, redis: { status: "up" } },
      status: "ok",
    });
  });

  it("ready returns 503 while shutting down", async () => {
    const { controller, shutdownState } = await createController();
    shutdownState.onModuleDestroy();

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ready()).rejects.toThrow(/Shutting down/u);
  });
});
