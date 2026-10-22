import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncPandascoreIncidentsUseCase } from "./sync-pandascore-incidents.use-case";
import type { CompetitionIncident } from "../../../pandascore/application/models/competition-feed";
describe("PandaScore incidents", () => {
  const feed = { listIncidents: vi.fn(), getTournamentById: vi.fn() },
    cursor = { getLastSyncAt: vi.fn(), setLastSyncAt: vi.fn() },
    sync = { applyIncident: vi.fn(), findTournamentByPandascoreId: vi.fn() },
    diagnostics = { error: vi.fn() };
  const now = new Date("2026-10-15T12:00:00Z");
  const service = new SyncPandascoreIncidentsUseCase(
    feed as never,
    cursor,
    sync as never,
    diagnostics,
    () => now,
  );
  const base = {
    id: 1,
    changeType: "update" as const,
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
    expect(feed.listIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ since: new Date("2026-10-14T12:00:00Z") }),
    );
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(now);
  });
  it.each(["tournament", "team", "league"] as const)(
    "applies normalized %s updates",
    async (kind) => {
      const incident = { ...base, kind, command: { pandascoreId: 42, name: "RLCS", slug: "rlcs" } };
      feed.listIncidents.mockResolvedValue([incident]);
      await service.execute();
      expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
      expect(cursor.setLastSyncAt).toHaveBeenCalledWith(base.modifiedAt);
    },
  );
  it.each([null, { pandascoreId: 7, name: "Current", slug: "current" }])(
    "preserves explicit current membership update %p",
    async (currentTeam) => {
      const incident = {
        ...base,
        kind: "player",
        command: { player: { pandascoreId: 1, name: "Player", slug: "player" }, currentTeam },
      };
      feed.listIncidents.mockResolvedValue([incident]);
      await service.execute();
      expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
    },
  );
  it("waits for each incident transaction before advancing and continues failures", async () => {
    const incidents: CompetitionIncident[] = [
      { ...base, kind: "team", command: { name: "A", slug: "a" } },
      {
        ...base,
        id: 2,
        modifiedAt: new Date("2026-10-15T11:00:00Z"),
        kind: "team",
        command: { name: "B", slug: "b" },
      },
    ];
    feed.listIncidents.mockResolvedValue(incidents);
    sync.applyIncident
      .mockRejectedValueOnce(new Error("rollback"))
      .mockResolvedValueOnce(undefined);
    await service.execute();
    expect(sync.applyIncident).toHaveBeenCalledTimes(2);
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(incidents[1].modifiedAt);
    expect(cursor.setLastSyncAt.mock.invocationCallOrder[0]).toBeGreaterThan(
      sync.applyIncident.mock.invocationCallOrder[1],
    );
  });
  it("hands deletions to the sync without a backfill and advances the cursor", async () => {
    const incident = {
      ...base,
      kind: "serie",
      changeType: "deletion",
      deletion: { kind: "merged", intoId: 9 },
    };
    feed.listIncidents.mockResolvedValue([incident]);
    await service.execute();
    expect(feed.getTournamentById).not.toHaveBeenCalled();
    expect(sync.applyIncident).toHaveBeenCalledWith(incident, undefined);
    expect(cursor.setLastSyncAt).toHaveBeenCalledWith(base.modifiedAt);
  });
  it("fetches missing tournament before the incident write", async () => {
    const incident = {
      ...base,
      kind: "match",
      command: { pandascoreId: 8, tournamentPandascoreId: 42 },
    };
    feed.listIncidents.mockResolvedValue([incident]);
    sync.findTournamentByPandascoreId.mockResolvedValue(null);
    const tournament = { pandascoreId: 42, name: "Cup" };
    feed.getTournamentById.mockResolvedValue(tournament);
    await service.execute();
    expect(feed.getTournamentById).toHaveBeenCalledWith(42);
    expect(sync.applyIncident).toHaveBeenCalledWith(incident, tournament);
  });
});
