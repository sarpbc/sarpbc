import { describe, expect, it } from "vitest";
import { Tournament } from "../../domain/tournament";
import type { CompetitionIncident } from "../feed";
import { memoryFeed } from "../feed.test-utils";
import { recordingDiagnostics } from "../ports.test-utils";
import { RecordingCompetitionSync } from "./competition-sync.test-utils";
import { SyncAllTournamentsUseCase } from "./sync-all-tournaments.use-case";
import { SyncNewTournamentsUseCase } from "./sync-new-tournaments.use-case";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";

const deletion: CompetitionIncident = {
  changeType: "deletion",
  deletion: { kind: "deleted" },
  id: 9,
  kind: "team",
  modifiedAt: new Date("2026-10-15T10:00:00Z"),
};

const run = async () => {
  const feed = memoryFeed();
  const sync = new RecordingCompetitionSync();
  const diagnostics = recordingDiagnostics();
  sync.idPrefix = "t";
  sync.outcomes = [null, null, null, null, new Error("boom"), null];

  for (const pandascoreId of [1, 2, 3]) {
    const command = { name: `Cup ${pandascoreId}`, pandascoreId };
    feed.tournaments.push(command);
    feed.tournamentsById.set(pandascoreId, command);
  }

  feed.incidents.push(deletion);

  const reads = {
    findById: async (id: string) =>
      Object.assign(new Tournament(), {
        id,
        pandascoreId: Number(id.slice(1)),
        source: "pandascore",
      }),
    findByPandascoreId: async () => null,
    knownPandascoreIds: async () => new Set<number>(),
  };

  const service = new SyncNewTournamentsUseCase(
    new SyncAllTournamentsUseCase(feed, reads, sync),
    new SyncPandascoreTournamentUseCase(feed, reads, sync),
    new SyncPandascoreIncidentsUseCase(
      feed,
      { getLastSyncAt: async () => new Date(0), setLastSyncAt: async () => {} },
      reads,
      sync,
      diagnostics,
    ),
    diagnostics,
  );

  const result = await service.execute();

  return { applied: sync.applied, diagnostics, result };
};

describe(SyncNewTournamentsUseCase, () => {
  it("counts discovered, synced and failed tournament details", async () => {
    const { result } = await run();

    expect(result).toStrictEqual({ detailsFailed: 1, detailsSynced: 2, discovered: 3 });
  });

  it("reconciles provider incidents after a failed detail sync", async () => {
    const { applied } = await run();

    expect(applied).toStrictEqual([{ backfill: undefined, incident: deletion }]);
  });

  it("reports the failed tournament detail sync", async () => {
    const { diagnostics } = await run();

    expect(diagnostics.errors).toStrictEqual([
      { cause: new Error("boom"), message: "Tournament detail sync failed: t2" },
    ]);
  });
});
