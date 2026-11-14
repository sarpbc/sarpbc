import { EntityManager } from "@mikro-orm/postgresql";
import { HealthIndicatorService } from "@nestjs/terminus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unconstructed } from "../../../test/doubles";
import { PostgresHealthIndicator } from "./postgres.health";

describe(PostgresHealthIndicator, () => {
  const execute = vi.fn<(sql: string) => Promise<Record<string, number>[]>>();

  const em = Object.assign(unconstructed(EntityManager), {
    getConnection: () => ({ execute }),
  });

  let indicator: PostgresHealthIndicator;

  beforeEach(() => {
    vi.clearAllMocks();
    indicator = new PostgresHealthIndicator(em, new HealthIndicatorService());
  });

  it("is up when SELECT 1 succeeds", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);

    await expect(indicator.pingCheck("postgres")).resolves.toStrictEqual({
      postgres: { status: "up" },
    });
    expect(execute).toHaveBeenCalledExactlyOnceWith("SELECT 1");
  });

  it("is down when the query fails", async () => {
    execute.mockRejectedValue(new Error("connection refused"));

    await expect(indicator.pingCheck("postgres")).resolves.toStrictEqual({
      postgres: { status: "down", message: "connection refused" },
    });
  });
});
