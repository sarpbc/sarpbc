import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { League } from "../../domain/league";
import { Tournament } from "../../domain/tournament";
import { TournamentEvent } from "../../domain/tournament-event";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { EventController } from "./event.controller";
import { eventQueries } from "../../../../test/competition-doubles";
import { unconstructed } from "../../../../test/doubles";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { CompetitionAfterCommit } from "../../application/after-commit";
import { StreamService } from "../../application/stream.service";
import { ViewershipService } from "../../application/viewership.service";
import type { GameStatsStore } from "../../../match-stats/application/ports";
import type { RedisService } from "../../../infrastructure/redis/redis.service";
import type { TournamentQueries } from "../../application/ports";
import { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";

const unusedStreams = new StreamService(
  { run: async () => await Promise.reject(new Error("unused")) },
  new CompetitionAfterCommit(
    { invalidateTournament: async () => {} },
    { publish: async () => {} },
    { error: () => {} },
  ),
);

const unusedViewerships = new ViewershipService({
  run: async () => await Promise.reject(new Error("unused")),
});

const STAGE_ID = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";

const league = Object.assign(new League(), {
  id: "league",
  name: "RLCS Major",
  imageUrl: "league.png",
});

const event = Object.assign(new TournamentEvent(), {
  id: "event",
  slug: "rlcs-major-paris-2026",
  name: "RLCS Major Paris 2026",
  league,
});

const ref = { id: event.id, slug: event.slug, name: event.name };

function stage(fields: Partial<Tournament>): Tournament {
  return Object.assign(new Tournament(), { event: ref, league, ...fields });
}

const stages = new Map(
  [
    stage({
      id: STAGE_ID,
      name: "Group A",
      slug: "group-a",
      beginAt: new Date("2026-05-01T10:00:00Z"),
      endAt: new Date("2026-05-03T10:00:00Z"),
      type: "online",
    }),
    stage({
      id: "playoffs",
      name: "Playoffs",
      slug: "playoffs",
      beginAt: new Date("2026-05-08T10:00:00Z"),
      endAt: new Date("2026-05-10T10:00:00Z"),
      prizepool: "1000000 United States Dollar",
      type: "offline",
    }),
  ].map((s) => [s.id, s]),
);

describe(EventController, () => {
  const playerLines = vi.fn<GameStatsStore["playerLines"]>(async () => []);
  const events = eventQueries();
  const listEvents = vi.spyOn(events, "list");
  const findEvent = vi.spyOn(events, "find");
  const stageId = vi.spyOn(events, "stageId");
  const redis = { get: vi.fn<RedisService["get"]>(), set: vi.fn<RedisService["set"]>() };
  const tournaments = { findById: vi.fn<TournamentQueries["findById"]>() };

  const catalog = unconstructed(ManualCatalogService);
  const manualEvents = vi.spyOn(catalog, "manualEvents");
  const findManualEvent = vi.spyOn(catalog, "findEvent");
  const createEvent = vi.spyOn(catalog, "createEvent");
  const updateEvent = vi.spyOn(catalog, "updateEvent");

  const controller = new EventController(
    events,
    new CachedTournamentRead(tournaments, redis),
    catalog,
    unusedStreams,
    unusedViewerships,
    new TournamentPlayerStatsService({ playerLines }),
  );

  beforeEach(() => {
    vi.resetAllMocks();
    redis.get.mockResolvedValue(null);
    tournaments.findById.mockImplementation(async (id: string) => stages.get(id) ?? null);
    findEvent.mockImplementation(async (slug: string) =>
      slug === event.slug ? { event, stages: [...stages.values()] } : null,
    );
    stageId.mockImplementation(async (eventSlug: string, stageSlug: string) =>
      eventSlug === event.slug && stageSlug === "playoffs" ? "playoffs" : null,
    );
  });

  it("resolves an event with its stages newest first and event-level facts", async () => {
    const resolved = await controller.resolveEvent("RLCS-Major-Paris-2026");
    expect(findEvent).toHaveBeenCalledWith("rlcs-major-paris-2026");
    expect(resolved).toMatchObject({
      kind: "event",
      event: {
        id: "event",
        slug: "rlcs-major-paris-2026",
        name: "RLCS Major Paris 2026",
        league: { id: "league", name: "RLCS Major" },
        logoUrl: "league.png",
        prizepool: "1000000 United States Dollar",
        type: "offline",
        beginAt: "2026-05-01T10:00:00.000Z",
        endAt: "2026-05-10T10:00:00.000Z",
      },
    });

    if (resolved.kind !== "event") throw new Error("expected an event");
    expect(resolved.event.stages.map((s) => s.slug)).toStrictEqual(["playoffs", "group-a"]);
    expect(resolved.event.stages[0]).toMatchObject({ matches: [], event: ref });
  });

  it("aggregates player stats over the redistributable stages of an event", async () => {
    findEvent.mockResolvedValueOnce({
      event,
      stages: [
        stage({ id: "group-stage", source: "manual" }),
        stage({ id: "qualifier", source: "startgg" }),
        stage({ id: "finals", source: "manual" }),
      ],
    });

    await expect(controller.playerStats(event.slug)).resolves.toStrictEqual({
      games: 0,
      players: [],
      unlinkedAccounts: 0,
    });
    expect(playerLines).toHaveBeenCalledWith(["group-stage", "finals"]);
    await expect(controller.playerStats("unknown-event")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("hides the player stats of an event whose stages all come from start.gg", async () => {
    findEvent.mockResolvedValueOnce({
      event,
      stages: [
        stage({ id: "open-qualifier", source: "startgg" }),
        stage({ id: "main-event", source: "startgg" }),
      ],
    });

    await expect(controller.playerStats(event.slug)).rejects.toBeInstanceOf(NotFoundError);
    expect(playerLines).not.toHaveBeenCalled();
  });

  it("resolves a stage by event and stage slugs", async () => {
    await expect(controller.resolveStage(event.slug, "Playoffs")).resolves.toMatchObject({
      kind: "stage",
      tab: "overview",
      tournament: { id: "playoffs", slug: "playoffs", event: ref },
    });
  });

  it("resolves a legacy stage id with its tab so the page can redirect", async () => {
    await expect(controller.resolveEvent(STAGE_ID.toUpperCase())).resolves.toMatchObject({
      kind: "stage",
      tab: "overview",
      tournament: { id: STAGE_ID, slug: "group-a" },
    });
    await expect(controller.resolveStage(STAGE_ID, "matches")).resolves.toMatchObject({
      kind: "stage",
      tab: "matches",
    });
  });

  it.each([
    ["an unknown event", ["unknown-event"]],
    ["an unknown stage", [event.slug, "finals"]],
    ["an unknown legacy id", ["7d4c1a52-3c1f-4f0e-8a7b-9e0d1c2b3a4f"]],
    ["a legacy id with another suffix", [STAGE_ID, "overview"]],
  ])("answers 404 for %s", async (_label, segments) => {
    const request =
      segments.length === 1
        ? controller.resolveEvent(segments[0])
        : controller.resolveStage(segments[0], segments[1]);

    await expect(request).rejects.toBeInstanceOf(NotFoundError);
  });

  it("answers 404 for an event whose stages all moved to another event", async () => {
    findEvent.mockResolvedValue({ event, stages: [] });
    await expect(controller.resolveEvent(event.slug)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists events with their stages and the total event count", async () => {
    listEvents.mockResolvedValue([[{ event, stages: [...stages.values()] }], 1]);
    const listed = await controller.list({ limit: 20, offset: 0, activeOnly: true });
    expect(listEvents).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      pickems: undefined,
      activeOnly: true,
    });
    expect(listed.count).toBe(1);
    expect(listed.events[0].stages.map((s) => s.name)).toStrictEqual(["Playoffs", "Group A"]);
    expect(listed.events[0].stages[0]).not.toHaveProperty("matches");
  });

  it("lists manual events for staff, including empty ones, with their stages", async () => {
    const empty = Object.assign(new TournamentEvent(), {
      id: "empty",
      slug: "cdf",
      name: "CDF",
    });

    const manualStages = [...stages.values()].map((s) =>
      Object.assign(new Tournament(), s, { source: "manual" }),
    );

    manualEvents.mockResolvedValue([
      { event, stages: manualStages },
      { event: empty, stages: [] },
    ]);
    const listed = await controller.listManual();
    expect(listed.events.map((e) => [e.id, e.editable, e.stages.length])).toStrictEqual([
      ["event", true, 2],
      ["empty", true, 0],
    ]);
    expect(listed.events[0].stages[0]).toMatchObject({
      id: "playoffs",
      source: "manual",
    });
  });

  it("marks an event followed by the PandaScore sync as not editable", async () => {
    const synced = Object.assign(new TournamentEvent(), event, { pandascoreSerieId: 7 });

    findManualEvent.mockResolvedValue({ event: synced, stages: [] });
    const findManualResult = await controller.findManual("event");
    expect(findManualResult.event).toMatchObject({
      id: "event",
      editable: false,
    });
  });

  it("creates and updates events through the catalog", async () => {
    createEvent.mockResolvedValue({ event, stages: [] });
    updateEvent.mockResolvedValue({ event, stages: [] });
    await expect(controller.create({ name: event.name })).resolves.toMatchObject({
      event: { id: "event", slug: event.slug, stages: [] },
    });
    await controller.update("event", { leagueId: null });
    expect(updateEvent).toHaveBeenCalledWith("event", {
      leagueId: null,
    });
  });
});
