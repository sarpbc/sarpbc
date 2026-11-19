import { beforeEach, describe, expect, it } from "vitest";
import { memoryFeed } from "../feed.test-utils";
import { recordingDiagnostics } from "../ports.test-utils";
import { RecordingCompetitionSync } from "./competition-sync.test-utils";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import type { CompetitionIncident } from "../feed";
import type { Tournament } from "../../domain/tournament";

describe("PandaScore incidents", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  let feed: ReturnType<typeof memoryFeed>;
  let sync: RecordingCompetitionSync;
  let knownTournaments: Tournament[];
  let lastSyncAt: Date | null;
  let cursorWrites: { date: Date; appliedSoFar: number }[];
  let service: SyncPandascoreIncidentsUseCase;

  const base = {
    changeType: "update" as const,
    id: 1,
    modifiedAt: new Date("2026-10-15T10:00:00Z"),
  };

  beforeEach(() => {
    feed = memoryFeed();
    sync = new RecordingCompetitionSync();
    knownTournaments = [];
    lastSyncAt = new Date("2026-10-14");
    cursorWrites = [];
    service = new SyncPandascoreIncidentsUseCase(
      feed,
      {
        getLastSyncAt: async () => lastSyncAt,
        setLastSyncAt: async (date) => {
          cursorWrites.push({ appliedSoFar: sync.applied.length, date });
        },
      },
      {
        findByPandascoreId: async (id) =>
          knownTournaments.find((tournament) => tournament.pandascoreId === id) ?? null,
      },
      sync,
      recordingDiagnostics(),
      () => now,
    );
  });

  const writtenDates = () => cursorWrites.map((write) => write.date);

  it("uses a one-day lookback and advances empty feeds to now", async () => {
    lastSyncAt = null;
    await service.execute();
    expect(feed.requestedIncidents).toStrictEqual([{ since: new Date("2026-10-14T12:00:00Z") }]);
    expect(writtenDates()).toContainEqual(now);
  });

  it("applies a non-match update without a backfill and advances the cursor", async () => {
    const incident: CompetitionIncident = {
      ...base,
      command: { name: "RLCS", pandascoreId: 42 },
      kind: "tournament",
    };

    feed.incidents.push(incident);
    await service.execute();
    expect(sync.applied).toContainEqual({ backfill: undefined, incident });
    expect(writtenDates()).toContainEqual(base.modifiedAt);
  });

  const team = (id: number, modifiedAt: string) =>
    ({
      ...base,
      command: { name: `T${id}`, slug: `t${id}` },
      id,
      kind: "team",
      modifiedAt: new Date(modifiedAt),
    }) satisfies CompetitionIncident;

  it("keeps processing after a failure but does not move the cursor past it", async () => {
    feed.incidents.push(team(1, "2026-10-15T10:00:00Z"), team(2, "2026-10-15T11:00:00Z"));
    sync.outcomes = [new Error("rollback"), null];
    await service.execute();
    expect(sync.applied).toHaveLength(2);
    expect(cursorWrites).toStrictEqual([
      { appliedSoFar: 2, date: new Date("2026-10-15T09:59:59.999Z") },
    ]);
  });

  it("stops the cursor before the earliest of several failures", async () => {
    feed.incidents.push(
      team(1, "2026-10-15T09:00:00Z"),
      team(2, "2026-10-15T10:00:00Z"),
      team(3, "2026-10-15T11:00:00Z"),
    );
    sync.outcomes = [null, new Error("b"), new Error("c")];
    await service.execute();
    expect(writtenDates()).toContainEqual(new Date("2026-10-15T09:59:59.999Z"));
  });

  it("never moves the cursor back before where this run started", async () => {
    feed.incidents.push(team(1, "2026-10-14T00:00:00Z"));
    sync.outcomes = [new Error("rollback")];
    await service.execute();
    expect(writtenDates()).toContainEqual(new Date("2026-10-14T00:00:00Z"));
  });

  it("hands deletions to the sync without a backfill and advances the cursor", async () => {
    const incident: CompetitionIncident = {
      ...base,
      changeType: "deletion",
      deletion: { intoId: 9, kind: "merged" },
      kind: "serie",
    };

    feed.incidents.push(incident);
    await service.execute();
    expect(feed.requestedTournaments).toStrictEqual([]);
    expect(sync.applied).toContainEqual({ backfill: undefined, incident });
    expect(writtenDates()).toContainEqual(base.modifiedAt);
  });

  it("fetches missing tournament before the incident write", async () => {
    const incident: CompetitionIncident = {
      ...base,
      command: {
        forfeit: false,
        name: "Final",
        officialStreams: [],
        opponentSlugs: [],
        pandascoreId: 8,
        previousMatches: [],
        results: [],
        tournamentPandascoreId: 42,
        winnerPandascoreTeamId: null,
      },
      kind: "match",
    };

    feed.incidents.push(incident);

    const tournament = { name: "Cup", pandascoreId: 42 };
    feed.tournamentsById.set(42, tournament);
    await service.execute();
    expect(sync.applied).toContainEqual({ backfill: tournament, incident });
  });
});
