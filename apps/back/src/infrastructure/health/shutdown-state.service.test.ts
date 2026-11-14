import { afterEach, describe, expect, it } from "vitest";
import { ShutdownStateService } from "./shutdown-state.service";

describe(ShutdownStateService, () => {
  const service = new ShutdownStateService();

  afterEach(() => {
    service.onModuleDestroy();
  });

  it("is not shutting down until the module is destroyed", () => {
    const fresh = new ShutdownStateService();

    expect(fresh.isShuttingDown()).toBe(false);

    fresh.onModuleDestroy();

    expect(fresh.isShuttingDown()).toBe(true);
  });

  it.each(["SIGTERM", "SIGINT"] as const)("starts shutting down on %s", (signal) => {
    const fresh = new ShutdownStateService();
    fresh.onModuleInit();

    process.emit(signal);

    expect(fresh.isShuttingDown()).toBe(true);
    fresh.onModuleDestroy();
  });
});
