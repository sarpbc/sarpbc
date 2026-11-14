import { beforeEach, describe, expect, it, vi } from "vitest";
import { competitionFeed } from "../../../../test/competition-doubles";
import { unconstructed } from "../../../../test/doubles";
import { CompetitionSyncService } from "./competition-sync.service";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import type { CompetitionFeed, CompetitionIncident } from "../feed";
import type { CompetitionDiagnostics, SyncCursor, TournamentQueries } from "../ports";

describe("PandaScore incidents", () => {
  const feed = {
    getTournamentById: vi.fn<CompetitionFeed["getTournamentById"]>(),
    listIncidents: vi.fn<CompetitionFeed["listIncidents"]>(),
  };

  const cursor = {
    getLastSyncAt: vi.fn<SyncCursor["getLastSyncAt"]>(),
    setLastSyncAt: vi.fn<SyncCursor["setLastSyncAt"]>(),
  };

  const reads = { findByPandascoreId: vi.fn<TournamentQueries["findByPandascoreId"]>() };
  const sync = { applyIncident: vi.fn<CompetitionSyncService["applyIncident"]>() };

  const diagnostics = {
    error: vi.fn<CompetitionDiagnostics["error"]>(),
    warn: vi.fn<CompetitionDiagnostics["warn"]>(),
  };

  const now = new Date("2026-10-15T12:00:00Z");

  const service = new SyncPandascoreIncidentsUseCase(
    competitionFeed(feed),
    cursor,
    reads,
    Object.assign(unconstructed(CompetitionSyncService), sync),
    diagnostics,
    () => now,
  );

  const base = {
    changeType: "update" as const,
    id: 1,
    modifiedAt: new Date("2026-10-15T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cursor.getLastSyncAt.mockResolvedValue(new Date("2026-10-14"));
    sync.applyIncident.mockResolvedValue(undefined);
  });

  it("uses a one-day lookback and advances empty feeds to now", async () => {
    cursor.getLastSyncAt.mockResolvedValue(null);
    feed.listIncidents.mockResolvedValue([]);
    await service.execute();
    expect(feed.listIncidents).toHaveBeenCalledWith({ since: new Date("2026-10-14T12:00:00Z") });
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(now);
  });

  it.each(["tournament", "team", "league"] as const)(
    "applies normalized %s updates",
    async (kind) => {
      const incident = { ...base, command: { name: "RLCS", pandascoreId: 42, slug: "rlcs" }, kind };
      feed.listIncidents.mockResolvedValue([incident]);
      await service.execute();
      expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
      expect(cursor.setLastSyncAt).toHaveBeenCalledWith(base.modifiedAt);
    },
  );

  it.each([null, { name: "Current", pandascoreId: 7, slug: "current" }])(
    "preserves explicit current membership update %p",
    async (currentTeam) => {
      const incident: CompetitionIncident = {
        ...base,
        command: { currentTeam, player: { name: "Player", pandascoreId: 1, slug: "player" } },
        kind: "player",
      };

      feed.listIncidents.mockResolvedValue([incident]);
      await service.execute();
      expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
    },
  );

  const team = (id: number, modifiedAt: string): CompetitionIncident => ({
    ...base,
    command: { name: `T${id}`, slug: `t${id}` },
    id,
    kind: "team",
    modifiedAt: new Date(modifiedAt),
  });

  it("keeps processing after a failure but does not move the cursor past it", async () => {
    const incidents = [team(1, "2026-10-15T10:00:00Z"), team(2, "2026-10-15T11:00:00Z")];
    feed.listIncidents.mockResolvedValue(incidents);
    sync.applyIncident
      .mockRejectedValueOnce(new Error("rollback"))
      .mockResolvedValueOnce(undefined);
    await service.execute();
    expect(sync.applyIncident).toHaveBeenCalledTimes(2);
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(new Date("2026-10-15T09:59:59.999Z"));
    expect(cursor.setLastSyncAt.mock.invocationCallOrder[0]).toBeGreaterThan(
      sync.applyIncident.mock.invocationCallOrder[1],
    );
  });

  it("stops the cursor before the earliest of several failures", async () => {
    const incidents = [
      team(1, "2026-10-15T09:00:00Z"),
      team(2, "2026-10-15T10:00:00Z"),
      team(3, "2026-10-15T11:00:00Z"),
    ];

    feed.listIncidents.mockResolvedValue(incidents);
    sync.applyIncident
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("b"))
      .mockRejectedValueOnce(new Error("c"));
    await service.execute();
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(new Date("2026-10-15T09:59:59.999Z"));
  });

  it("never moves the cursor back before where this run started", async () => {
    feed.listIncidents.mockResolvedValue([team(1, "2026-10-14T00:00:00Z")]);
    sync.applyIncident.mockRejectedValueOnce(new Error("rollback"));
    await service.execute();
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(new Date("2026-10-14T00:00:00Z"));
  });

  it("hands deletions to the sync without a backfill and advances the cursor", async () => {
    const incident: CompetitionIncident = {
      ...base,
      changeType: "deletion",
      deletion: { intoId: 9, kind: "merged" },
      kind: "serie",
    };

    feed.listIncidents.mockResolvedValue([incident]);
    await service.execute();
    expect(feed.getTournamentById).not.toHaveBeenCalled();
    expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(base.modifiedAt);
  });

  it("fetches missing tournament before the incident write", async () => {
    const incident: CompetitionIncident = {
      ...base,
      command: {
        name: "Final",
        officialStreams: [],
        opponentSlugs: [],
        pandascoreId: 8,
        previousMatches: [],
        results: [],
        tournamentPandascoreId: 42,
      },
      kind: "match",
    };

    feed.listIncidents.mockResolvedValue([incident]);
    reads.findByPandascoreId.mockResolvedValue(null);
    const tournament = { name: "Cup", pandascoreId: 42 };
    feed.getTournamentById.mockResolvedValue(tournament);
    await service.execute();
    expect(feed.getTournamentById).toHaveBeenCalledWith(42);
    expect(sync.applyIncident).toHaveBeenCalledWith(incident, tournament);
  });
});
