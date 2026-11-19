import { EntityManager } from "@mikro-orm/postgresql";
import { HealthIndicatorService } from "@nestjs/terminus";
import { describe, expect, it } from "vitest";
import { unconstructed } from "../../../test/doubles";
import { PostgresHealthIndicator } from "./postgres.health";

class ScriptedConnection {
  constructor(private readonly failure: Error | null) {}

  async execute() {
    if (this.failure) {
      throw this.failure;
    }

    return await Promise.resolve([{ "?column?": 1 }]);
  }
}

const indicatorOver = (connection: ScriptedConnection) =>
  new PostgresHealthIndicator(
    Object.assign(unconstructed(EntityManager), { getConnection: () => connection }),
    new HealthIndicatorService(),
  );

describe(PostgresHealthIndicator, () => {
  it("is up when the query succeeds", async () => {
    await expect(
      indicatorOver(new ScriptedConnection(null)).pingCheck("postgres"),
    ).resolves.toStrictEqual({ postgres: { status: "up" } });
  });

  it("is down when the query fails", async () => {
    const connection = new ScriptedConnection(new Error("connection refused"));

    await expect(indicatorOver(connection).pingCheck("postgres")).resolves.toStrictEqual({
      postgres: { message: "connection refused", status: "down" },
    });
  });
});
