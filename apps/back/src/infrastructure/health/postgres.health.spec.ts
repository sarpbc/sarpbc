import { PostgresHealthIndicator } from "./postgres.health";

describe("PostgresHealthIndicator", () => {
  const up = jest.fn().mockReturnValue({ postgres: { status: "up" } });
  const down = jest.fn().mockReturnValue({ postgres: { status: "down" } });
  const healthIndicatorService = {
    check: jest.fn().mockReturnValue({ up, down }),
  };
  const execute = jest.fn();
  const em = {
    getConnection: () => ({ execute }),
  };

  let indicator: PostgresHealthIndicator;

  beforeEach(() => {
    jest.clearAllMocks();
    healthIndicatorService.check.mockReturnValue({ up, down });
    indicator = new PostgresHealthIndicator(em as never, healthIndicatorService as never);
  });

  it("is up when SELECT 1 succeeds", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);

    await expect(indicator.pingCheck("postgres")).resolves.toEqual({
      postgres: { status: "up" },
    });
    expect(execute).toHaveBeenCalledWith("SELECT 1");
    expect(up).toHaveBeenCalled();
  });

  it("is down when the query fails", async () => {
    execute.mockRejectedValue(new Error("connection refused"));

    await expect(indicator.pingCheck("postgres")).resolves.toEqual({
      postgres: { status: "down" },
    });
    expect(down).toHaveBeenCalledWith({ message: "connection refused" });
  });
});
