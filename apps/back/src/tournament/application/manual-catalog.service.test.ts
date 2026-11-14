import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { League } from "../domain/competition";
import { TournamentEvent } from "../domain/tournament-event";
import { CompetitionAfterCommit } from "./after-commit";
import { ManualCatalogService } from "./manual-catalog.service";
import type { EventStage } from "./ports";

describe("ManualCatalogService", () => {
  const events = new Map<string, TournamentEvent>();
  const leagues = new Map<string, League>();
  let stages: EventStage[] = [];

  const eventWriter = {
    load: vi.fn(async (id: string) => {
      const event = events.get(id);

      return event ? Object.assign(new TournamentEvent(), event) : null;
    }),
    slugTaken: vi.fn(async (slug: string, except: string | null) =>
      [...events.values()].some((event) => event.slug === slug && event.id !== except),
    ),
    stages: vi.fn(async () => stages),
    save: vi.fn(async (event: TournamentEvent) => {
      events.set(event.id, Object.assign(new TournamentEvent(), event));
    }),
  };

  const tournamentWriter = {
    league: vi.fn(async (id: string) => {
      const league = leagues.get(id);

      return league ? Object.assign(new League(), league) : null;
    }),
    saveLeague: vi.fn(async (league: League) => {
      leagues.set(league.id, Object.assign(new League(), league));
    }),
  };

  const tx = {
    run: async <T>(work: (scope: never) => Promise<T>) =>
      await work({ tournaments: tournamentWriter, events: eventWriter } as never),
  };

  const queries = {
    list: vi.fn(),
    find: vi.fn(async (idOrSlug: string) => {
      const event = events.get(idOrSlug);

      return event ? { event, stages: [] } : null;
    }),
    stageId: vi.fn(),
    unsynced: vi.fn(),
  };

  const cache = { invalidateTournament: vi.fn() },
    diagnostics = { error: vi.fn(), warn: vi.fn() };

  const service = new ManualCatalogService(
    { leagues: vi.fn() } as never,
    queries,
    tx,
    new CompetitionAfterCommit(cache, { publish: vi.fn() }, diagnostics),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    events.clear();
    leagues.clear();
    stages = [];
    events.set(
      "cdf",
      Object.assign(new TournamentEvent(), {
        id: "cdf",
        slug: "coupe-de-france-2026",
        name: "CDF",
      }),
    );
    leagues.set(
      "rlcs",
      Object.assign(new League(), { id: "rlcs", pandascoreId: 4562, name: "RLCS", slug: "rlcs" }),
    );
  });

  it("creates an empty event under a generated, deduplicated slug", async () => {
    const created = await service.createEvent({ name: "Coupe de France 2026", leagueId: "rlcs" });
    expect(created.event).toMatchObject({
      name: "Coupe de France 2026",
      slug: "coupe-de-france-2026-2",
      league: { id: "rlcs" },
      pandascoreSerieId: null,
    });
    expect(created.stages).toEqual([]);
  });

  it("rejects a taken explicit slug and an unknown league", async () => {
    await expect(
      service.createEvent({ name: "Other", slug: "coupe-de-france-2026" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(service.createEvent({ name: "Other", leagueId: "nope" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("renames a manual event and refreshes the cache of its stages", async () => {
    stages = [
      { id: "pool", name: "Poule", source: "manual" },
      { id: "finals", name: "Finals", source: "manual" },
    ];

    const updated = await service.updateEvent("cdf", {
      name: "Coupe de France Slash 2026",
      slug: "coupe-de-france-slash-2026",
      leagueId: null,
    });

    expect(updated.event).toMatchObject({
      name: "Coupe de France Slash 2026",
      slug: "coupe-de-france-slash-2026",
      league: null,
    });
    expect(cache.invalidateTournament.mock.calls).toEqual([["pool"], ["finals"]]);
  });

  it.each([
    ["follows a serie", { pandascoreSerieId: 9 }, []],
    ["holds a PandaScore stage", {}, [{ id: "s", name: "Swiss", source: "pandascore" as const }]],
  ])("rejects editing an event that %s", async (_label, patch, synced) => {
    Object.assign(events.get("cdf")!, patch);
    stages = synced;
    await expect(service.updateEvent("cdf", { name: "Renamed" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(eventWriter.save).not.toHaveBeenCalled();
  });

  it("lists only events the staff can edit, empty ones included", async () => {
    const event = (id: string, pandascoreSerieId: number | null = null) =>
      Object.assign(new TournamentEvent(), { id, slug: id, name: id, pandascoreSerieId });

    queries.unsynced.mockResolvedValue([
      { event: event("empty"), stages: [] },
      { event: event("manual"), stages: [{ id: "pool", source: "manual" }] },
      { event: event("mixed"), stages: [{ id: "swiss", source: "pandascore" }] },
      { event: event("serie", 3), stages: [] },
    ]);
    expect((await service.manualEvents()).map(({ event }) => event.id)).toEqual([
      "empty",
      "manual",
    ]);
  });

  it("creates a manual league with a slug from its name", async () => {
    const league = await service.createLeague({ name: "Coupe de France", imageUrl: " " });
    expect(league).toMatchObject({
      pandascoreId: null,
      name: "Coupe de France",
      slug: "coupe-de-france",
      imageUrl: null,
    });
    expect(leagues.get(league.id)).toMatchObject({ name: "Coupe de France" });
  });

  it("edits only the image of a PandaScore league", async () => {
    expect(
      await service.updateLeague("rlcs", { imageUrl: "https://cdn.example/rlcs.png" }),
    ).toMatchObject({ name: "RLCS", imageUrl: "https://cdn.example/rlcs.png" });
    await expect(service.updateLeague("rlcs", { name: "RLCS 2026" })).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    await expect(service.updateLeague("ghost", { name: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
