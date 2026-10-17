import { expect, it, vi } from "vitest";
import { SyncNewTournamentsUseCase } from "./sync-new-tournaments.use-case";
it("discovers missing tournaments, continues failed details, then reconciles incidents", async () => {
  const additions = { execute: vi.fn().mockResolvedValue(["t1", "t2"]) },
    details = {
      execute: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("boom")),
    },
    incidents = { execute: vi.fn() },
    diagnostics = { error: vi.fn() };
  const service = new SyncNewTournamentsUseCase(
    additions as never,
    details as never,
    incidents as never,
    diagnostics,
  );
  expect(await service.execute()).toEqual({ discovered: 2, detailsSynced: 1, detailsFailed: 1 });
  expect(details.execute).toHaveBeenCalledWith("t1");
  expect(details.execute).toHaveBeenCalledWith("t2");
  expect(incidents.execute).toHaveBeenCalled();
  expect(diagnostics.error).toHaveBeenCalled();
});
