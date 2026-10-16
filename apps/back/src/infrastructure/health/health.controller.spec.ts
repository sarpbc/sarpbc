import { ServiceUnavailableException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";
import { ShutdownStateService } from "./shutdown-state.service";

describe("HealthController", () => {
  let controller: HealthController;
  const health = {
    check: jest.fn(),
  };
  const postgres = {
    pingCheck: jest.fn(),
  };
  const redis = {
    pingCheck: jest.fn(),
  };
  const shutdownState = {
    isShuttingDown: jest.fn().mockReturnValue(false),
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
    jest.clearAllMocks();
    shutdownState.isShuttingDown.mockReturnValue(false);
  });

  it("live reports that the process is up", () => {
    expect(controller.live()).toEqual({ status: "ok" });
  });

  it("ready pings postgres and redis", async () => {
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      await Promise.all(indicators.map((indicator) => indicator()));
      return { status: "ok" };
    });

    await expect(controller.ready()).resolves.toEqual({ status: "ok" });
    expect(postgres.pingCheck).toHaveBeenCalledWith("postgres");
    expect(redis.pingCheck).toHaveBeenCalledWith("redis");
  });

  it("ready returns 503 while shutting down", () => {
    shutdownState.isShuttingDown.mockReturnValue(true);

    expect(() => controller.ready()).toThrow(ServiceUnavailableException);
    expect(() => controller.ready()).toThrow(/Shutting down/);
    expect(health.check).not.toHaveBeenCalled();
  });
});
