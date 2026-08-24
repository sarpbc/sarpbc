import { ShutdownStateService } from "./shutdown-state.service";

describe("ShutdownStateService", () => {
  it("is not shutting down until the module is destroyed", () => {
    const service = new ShutdownStateService();

    expect(service.isShuttingDown()).toBe(false);

    service.onModuleDestroy();

    expect(service.isShuttingDown()).toBe(true);
  });
});
