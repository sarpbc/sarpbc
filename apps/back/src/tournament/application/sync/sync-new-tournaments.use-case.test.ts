import { expect, it, vi } from "vitest";
import { SyncNewTournamentsUseCase } from "./sync-new-tournaments.use-case";

it("syncs every discovered tournament despite a failure, then reconciles incidents", async () => {
  const steps: string[] = [];
  const additions = { execute: vi.fn().mockResolvedValue(["t1", "t2", "t3"]) };

  const details = {
    execute: vi.fn(async (id: string) => {
      steps.push(`details:${id}`);

      if (id === "t2") throw new Error("boom");
    }),
  };

  const incidents = { execute: vi.fn(async () => void steps.push("incidents")) };
  const diagnostics = { error: vi.fn(), warn: vi.fn() };

  const service = new SyncNewTournamentsUseCase(
    additions as never,
    details as never,
    incidents as never,
    diagnostics,
  );

  expect(await service.execute()).toEqual({ discovered: 3, detailsSynced: 2, detailsFailed: 1 });
  expect(steps).toEqual(["details:t1", "details:t2", "details:t3", "incidents"]);
  expect(diagnostics.error).toHaveBeenCalledOnce();
});
