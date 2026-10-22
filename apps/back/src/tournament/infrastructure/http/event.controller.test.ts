import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../common/domain/errors";
import { League, Tournament } from "../../domain/competition";
import { TournamentEvent } from "../../domain/tournament-event";
import { CachedTournamentRead } from "../cache/cached-tournament.read";
import { EventController } from "./event.controller";

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

describe("EventController", () => {
  const events = { list: vi.fn(), findBySlug: vi.fn(), findStageId: vi.fn() };
  const redis = { get: vi.fn(), set: vi.fn() };
  const tournaments = { findById: vi.fn() };
  const controller = new EventController(
    events as never,
    new CachedTournamentRead(tournaments, redis),
  );

  beforeEach(() => {
    vi.resetAllMocks();
    redis.get.mockResolvedValue(null);
    tournaments.findById.mockImplementation(async (id: string) => stages.get(id) ?? null);
    events.findBySlug.mockImplementation(async (slug: string) =>
      slug === event.slug ? { event, stageIds: [...stages.keys()] } : null,
    );
    events.findStageId.mockImplementation(async (eventSlug: string, stageSlug: string) =>
      eventSlug === event.slug && stageSlug === "playoffs" ? "playoffs" : null,
    );
  });

  it("resolves an event with its stages newest first and event-level facts", async () => {
    const resolved = await controller.resolveEvent("RLCS-Major-Paris-2026");
    expect(events.findBySlug).toHaveBeenCalledWith("rlcs-major-paris-2026");
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
        beginAt: new Date("2026-05-01T10:00:00Z"),
        endAt: new Date("2026-05-10T10:00:00Z"),
      },
    });
    if (resolved.kind !== "event") throw new Error("expected an event");
    expect(resolved.event.stages.map((s) => s.slug)).toEqual(["playoffs", "group-a"]);
    expect(resolved.event.stages[0]).toMatchObject({ matches: [], event: ref });
  });

  it("resolves a stage by event and stage slugs", async () => {
    expect(await controller.resolveStage(event.slug, "Playoffs")).toMatchObject({
      kind: "stage",
      tab: "overview",
      tournament: { id: "playoffs", slug: "playoffs", event: ref },
    });
  });

  it("resolves a legacy stage id with its tab so the page can redirect", async () => {
    expect(await controller.resolveEvent(STAGE_ID.toUpperCase())).toMatchObject({
      kind: "stage",
      tab: "overview",
      tournament: { id: STAGE_ID, slug: "group-a" },
    });
    expect(await controller.resolveStage(STAGE_ID, "matches")).toMatchObject({
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

  it("lists events with their stages and the total event count", async () => {
    events.list.mockResolvedValue([[{ event, stages: [...stages.values()] }], 1]);
    const listed = await controller.list({ limit: 20, offset: 0, activeOnly: true });
    expect(events.list).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      pickems: undefined,
      activeOnly: true,
    });
    expect(listed.count).toBe(1);
    expect(listed.events[0].stages.map((s) => s.name)).toEqual(["Playoffs", "Group A"]);
    expect(listed.events[0].stages[0].matches).toBeUndefined();
  });
});
