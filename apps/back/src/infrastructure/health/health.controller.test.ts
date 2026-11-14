import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService, type HealthIndicatorResult } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";
import { ShutdownStateService } from "./shutdown-state.service";

describe("HealthController", () => {
  let controller: HealthController;

  const health = {
    check: vi.fn(),
  };

  const postgres = {
    pingCheck: vi.fn(),
  };

  const redis = {
    pingCheck: vi.fn(),
  };

  const shutdownState = {
    isShuttingDown: vi.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: PostgresHealthIndicator, useValue: postgres },
        { provide: RedisHealthIndicator, useValue: redis },
        { provide: ShutdownStateService, useValue: shutdownState },
      ],
    }).compile();

    controller = module.get(HealthController);
    vi.clearAllMocks();
    shutdownState.isShuttingDown.mockReturnValue(false);
  });

  it("live reports that the process is up", () => {
    expect(controller.live()).toEqual({ status: "ok" });
  });

  it("ready pings postgres and redis", async () => {
    health.check.mockImplementation(
      async (indicators: (() => Promise<HealthIndicatorResult>)[]) => {
        await Promise.all(indicators.map(async (indicator) => await indicator()));

        return { status: "ok" };
      },
    );

    await expect(controller.ready()).resolves.toEqual({ status: "ok" });
    expect(postgres.pingCheck).toHaveBeenCalledWith("postgres");
    expect(redis.pingCheck).toHaveBeenCalledWith("redis");
  });

  it("ready returns 503 while shutting down", async () => {
    shutdownState.isShuttingDown.mockReturnValue(true);

    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ready()).rejects.toThrow(/Shutting down/);
    expect(health.check).not.toHaveBeenCalled();
  });
});
