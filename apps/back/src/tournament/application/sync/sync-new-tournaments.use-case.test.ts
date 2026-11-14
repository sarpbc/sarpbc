import { describe, expect, it, vi } from "vitest";
import { unconstructed } from "../../../../test/doubles";
import type { CompetitionDiagnostics } from "../ports";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncNewTournamentsUseCase } from "./sync-new-tournaments.use-case";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

async function run() {
  const steps: string[] = [];

  const additions = {
    execute: vi.fn<SyncAllTournamentsUseCase["execute"]>().mockResolvedValue(["t1", "t2", "t3"]),
  };

  const details = {
    execute: vi.fn<SyncPandascoreTournamentUseCase["execute"]>(async (id) => {
      steps.push(`details:${id}`);

      if (id === "t2") throw new Error("boom");
    }),
  };

  const incidents = {
    execute: vi.fn<SyncPandascoreIncidentsUseCase["execute"]>(async () => {
      steps.push("incidents");
    }),
  };

  const diagnostics = {
    error: vi.fn<CompetitionDiagnostics["error"]>(),
    warn: vi.fn<CompetitionDiagnostics["warn"]>(),
  };

  const service = new SyncNewTournamentsUseCase(
    Object.assign(unconstructed(SyncAllTournamentsUseCase), additions),
    Object.assign(unconstructed(SyncPandascoreTournamentUseCase), details),
    Object.assign(unconstructed(SyncPandascoreIncidentsUseCase), incidents),
    diagnostics,
  );

  const result = await service.execute();

  return { result, steps, diagnostics };
}

describe(SyncNewTournamentsUseCase, () => {
  it("counts discovered, synced and failed tournament details", async () => {
    const { result } = await run();

    expect(result).toStrictEqual({ discovered: 3, detailsSynced: 2, detailsFailed: 1 });
  });

  it("syncs every discovered tournament despite a failure, then reconciles incidents", async () => {
    const { steps } = await run();

    expect(steps).toStrictEqual(["details:t1", "details:t2", "details:t3", "incidents"]);
  });

  it("reports the failed tournament detail sync", async () => {
    const { diagnostics } = await run();

    expect(diagnostics.error).toHaveBeenCalledExactlyOnceWith(
      "Tournament detail sync failed: t2",
      new Error("boom"),
    );
  });
});
