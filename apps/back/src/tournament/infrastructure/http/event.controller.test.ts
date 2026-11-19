import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { League } from "../../domain/league";
import { Tournament } from "../../domain/tournament";
import { TournamentEvent } from "../../domain/tournament-event";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { EventController } from "./event.controller";
import { tournamentQueries } from "../../../../test/competition-doubles";
import { present } from "../../../../test/doubles";
import { ManualCatalogService } from "../../application/manual-catalog.service";
import { CompetitionAfterCommit } from "../../application/after-commit";
import { StreamService } from "../../application/stream.service";
import { ViewershipService } from "../../application/viewership.service";
import { fakePlayerStats } from "../../../match-stats/application/fake-player-stats.test-utils";
import { memoryEventQueries } from "../../application/event-queries.test-utils";
import {
  memoryEventWriter,
  memoryTournamentWriter,
  recordingCache,
  recordingDiagnostics,
  recordingEvents,
  transactionOver,
} from "../../application/ports.test-utils";
import { memoryRedis } from "../cache/memory-redis.test-utils";
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
  imageUrl: "league.png",
  name: "RLCS Major",
});

const event = Object.assign(new TournamentEvent(), {
  id: "event",
  league,
  name: "RLCS Major Paris 2026",
  slug: "rlcs-major-paris-2026",
});

const ref = { id: event.id, name: event.name, slug: event.slug };

const stage = (fields: Partial<Tournament>) =>
  Object.assign(new Tournament(), { event: ref, league, ...fields });

const stages = new Map(
  [
    stage({
      beginAt: new Date("2026-05-01T10:00:00Z"),
      endAt: new Date("2026-05-03T10:00:00Z"),
      id: STAGE_ID,
      name: "Group A",
      slug: "group-a",
      type: "online",
    }),
    stage({
      beginAt: new Date("2026-05-08T10:00:00Z"),
      endAt: new Date("2026-05-10T10:00:00Z"),
      id: "playoffs",
      name: "Playoffs",
      prizepool: "1000000 United States Dollar",
      slug: "playoffs",
      type: "offline",
    }),
  ].map((s) => [s.id, s]),
);

describe(EventController, () => {
  const stats = fakePlayerStats({
    player: { id: "zen", name: "zen", slug: "zen" },
    team: { id: "team-vit", name: "Vitality", slug: "vitality" },
    teamGoals: 0,
    totals: { assists: 0, demolitions: 0, goals: 0, saves: 0, shots: 0 },
  });

  const eventWriter = memoryEventWriter();
  const events = memoryEventQueries(eventWriter);
  const listEvents = vi.spyOn(events, "list");
  const redis = memoryRedis();
  const stored = new Map<string, Tournament>();
  const tournaments = { findById: async (id: string) => stored.get(id) ?? null };

  const catalog = new ManualCatalogService(
    tournamentQueries(),
    events,
    transactionOver({ events: eventWriter, tournaments: memoryTournamentWriter() }),
    new CompetitionAfterCommit(recordingCache(), recordingEvents(), recordingDiagnostics()),
  );

  const controller = new EventController(
    events,
    new CachedTournamentRead(tournaments, redis),
    catalog,
    unusedStreams,
    unusedViewerships,
    new TournamentPlayerStatsService(stats),
  );

  beforeEach(() => {
    listEvents.mockClear();
    stats.scopes.length = 0;
    redis.entries.clear();
    stored.clear();

    for (const [id, found] of stages) {
      stored.set(id, found);
    }

    eventWriter.events.clear();
    eventWriter.events.set(event.id, Object.assign(new TournamentEvent(), event));
    events.listings.length = 0;
    events.listings.push({ event, stages: [...stages.values()] });
  });

  it("resolves an event with its stages newest first and event-level facts", async () => {
    const resolved = await controller.resolveEvent("RLCS-Major-Paris-2026");
    expect(resolved).toMatchObject({
      event: {
        beginAt: "2026-05-01T10:00:00.000Z",
        endAt: "2026-05-10T10:00:00.000Z",
        id: "event",
        league: { id: "league", name: "RLCS Major" },
        logoUrl: "league.png",
        name: "RLCS Major Paris 2026",
        prizepool: "1000000 United States Dollar",
        slug: "rlcs-major-paris-2026",
        type: "offline",
      },
      kind: "event",
    });

    if (resolved.kind !== "event") {
      throw new Error("expected an event");
    }

    const resolvedEvent = present(resolved.event);

    expect(resolvedEvent.stages.map((s) => s.slug)).toStrictEqual(["playoffs", "group-a"]);
    expect(resolvedEvent.stages[0]).toMatchObject({ event: ref, matches: [] });
  });

  it("aggregates player stats over the redistributable stages of an event", async () => {
    events.listings.splice(0, events.listings.length, {
      event,
      stages: [
        stage({ id: "group-stage", source: "manual" }),
        stage({ id: "qualifier", source: "startgg" }),
        stage({ id: "finals", source: "manual" }),
      ],
    });

    await expect(controller.playerStats(event.slug)).resolves.toMatchObject({
      games: 2,
      players: [{ games: 2 }],
    });
    expect(stats.scopes).toStrictEqual([{ ids: ["group-stage", "finals"], kind: "tournaments" }]);
    await expect(controller.playerStats("unknown-event")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("hides the player stats of an event whose stages all come from start.gg", async () => {
    events.listings.splice(0, events.listings.length, {
      event,
      stages: [
        stage({ id: "open-qualifier", source: "startgg" }),
        stage({ id: "main-event", source: "startgg" }),
      ],
    });

    await expect(controller.playerStats(event.slug)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("resolves a stage by event and stage slugs", async () => {
    await expect(controller.resolveStage(event.slug, "Playoffs")).resolves.toMatchObject({
      kind: "stage",
      tab: "overview",
      tournament: { event: ref, id: "playoffs", slug: "playoffs" },
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
    events.listings.splice(0, events.listings.length, { event, stages: [] });
    await expect(controller.resolveEvent(event.slug)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists events with their stages and the total event count", async () => {
    const listed = await controller.list({ activeOnly: true, limit: 20, offset: 0 });
    expect(listEvents).toHaveBeenCalledWith({
      activeOnly: true,
      limit: 20,
      offset: 0,
      pickems: undefined,
    });
    expect(listed.count).toBe(1);
    expect(listed.events[0].stages.map((s) => s.name)).toStrictEqual(["Playoffs", "Group A"]);
    expect(listed.events[0].stages[0]).not.toHaveProperty("matches");
  });

  it("lists manual events for staff, including empty ones, with their stages", async () => {
    const empty = Object.assign(new TournamentEvent(), {
      id: "empty",
      name: "CDF",
      slug: "cdf",
    });

    const manualStages = [...stages.values()].map((s) =>
      Object.assign(new Tournament(), s, { source: "manual" }),
    );

    events.listings.splice(
      0,
      events.listings.length,
      { event, stages: manualStages },
      { event: empty, stages: [] },
    );
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

    events.listings.splice(0, events.listings.length, { event: synced, stages: [] });
    const findManualResult = await controller.findManual("event");
    expect(findManualResult.event).toMatchObject({
      editable: false,
      id: "event",
    });
  });

  it("creates and updates events through the catalog", async () => {
    const created = await controller.create({ name: "Spring Open" });

    expect(created).toMatchObject({ event: { name: "Spring Open", stages: [] } });
    expect(eventWriter.events.has(created.event.id)).toBe(true);
    await controller.update("event", { leagueId: null });
    expect(eventWriter.events.get("event")?.league).toBeNull();
  });
});
