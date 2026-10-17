import "reflect-metadata";
import { vi } from "vitest";

vi.mock("evlog", () => {
  const logger = () => ({
    set: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    emit: vi.fn(),
  });

  return {
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    initLogger: vi.fn(),
    createLogger: vi.fn(logger),
  };
});

vi.mock("evlog/nestjs", () => ({
  EvlogModule: { forRoot: vi.fn(() => class EvlogModuleMock {}) },
  useLogger: vi.fn(() => ({
    set: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    emit: vi.fn(),
  })),
}));
