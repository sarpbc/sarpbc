import { describe, expect, it, vi } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { League, Tournament } from "../../../tournament/domain/competition";
import { TournamentEvent } from "../../../tournament/domain/tournament-event";
import type { DataSource } from "@sarpbc/types";
import { redistributableCompetition } from "../redistributable-competition";
import { eventTools } from "./event-tools";

function stage(id: string, source: DataSource, beginAt: string | null) {
  return Object.assign(new Tournament(), {
    id,
    name: id,
    slug: id,
    source,
    tier: "B",
    beginAt: beginAt ? new Date(beginAt) : null,
    endAt: beginAt ? new Date(beginAt) : null,
    event: { id: "cdf", slug: "cdf-2026", name: "CDF 2026" },
  });
}

type ToolInput = {
  idOrSlug?: string;
  eventId?: string;
  leagueId?: string;
  name?: string;
};

function setup(role: "admin" | "journalist" = "admin") {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");
  const event = Object.assign(new TournamentEvent(), {
    id: "cdf",
    slug: "cdf-2026",
    name: "CDF 2026",
  });
  const listing = {
    event,
    stages: [
      stage("finals", "manual", "2026-11-12T18:00:00Z"),
      stage("qualifier", "startgg", "2026-10-01T18:00:00Z"),
      stage("pool", "manual", "2026-11-05T18:00:00Z"),
    ],
  };
  const catalogService = {
    leagues: vi.fn(),
    findEvent: vi.fn().mockResolvedValue(listing),
    createEvent: vi.fn().mockResolvedValue({ event, stages: [] }),
    updateEvent: vi.fn().mockResolvedValue(listing),
    createLeague: vi.fn(),
    updateLeague: vi.fn(),
  };
  const eventQueries = { list: vi.fn().mockResolvedValue([[listing], 1]) };
  const tools = eventTools({
    catalogService,
    competition: redistributableCompetition({
      catalogService,
      events: eventQueries,
      tournaments: { find: vi.fn(), findById: vi.fn() },
      matchService: { list: vi.fn() },
      matchLineupService: { find: vi.fn() },
      tournamentPlayerStatsService: { forStages: vi.fn() },
      tournamentPrizeService: {
        findByTournamentId: vi.fn(),
        teamEarnings: vi.fn(),
        playerEarnings: vi.fn(),
      },
      playerAwardService: { findByTournamentId: vi.fn() },
    }),
  });
  const tool = (name: string) => {
    const found = tools.find((candidate) => candidate.name === name);
    if (!found) throw new Error(`${name} is not defined`);
    return (input: ToolInput) => found.run({ id: "u1", email: "staff@test.com", role }, input);
  };
  return { catalogService, eventQueries, tool, listing };
}

const json = (result: CallToolResult) => {
  const block = result.content[0];
  return JSON.parse(block?.type === "text" ? block.text : "null");
};

describe("event tools", () => {
  it("returns an event's redistributable stages earliest first with its overall dates", async () => {
    const { tool } = setup();
    expect(json(await tool("get_event")({ idOrSlug: "cdf-2026" }))).toMatchObject({
      id: "cdf",
      editable: true,
      beginAt: "2026-11-05T18:00:00.000Z",
      endAt: "2026-11-12T18:00:00.000Z",
      stages: [
        { id: "pool", tier: "B", url: "https://sarpbc.test/tournaments/cdf-2026/pool" },
        { id: "finals" },
      ],
      url: "https://sarpbc.test/tournaments/cdf-2026",
    });
  });

  it("hides an event made only of start.gg stages but returns an empty one", async () => {
    const { tool, catalogService, listing } = setup();
    catalogService.findEvent.mockResolvedValueOnce({
      event: listing.event,
      stages: [stage("qualifier", "startgg", null)],
    });
    expect((await tool("get_event")({ idOrSlug: "cdf" })).isError).toBe(true);
    catalogService.findEvent.mockResolvedValueOnce({ event: listing.event, stages: [] });
    expect(json(await tool("get_event")({ idOrSlug: "cdf" }))).toMatchObject({ stages: [] });
  });

  it("excludes start.gg events in the list query", async () => {
    const { tool, eventQueries } = setup();
    await tool("list_events")({});
    expect(eventQueries.list).toHaveBeenCalledWith({
      activeOnly: false,
      redistributableOnly: true,
      limit: 20,
      offset: 0,
    });
  });

  it("reports synced events as not editable", async () => {
    const { tool, catalogService, listing } = setup();
    catalogService.findEvent.mockResolvedValueOnce({
      event: listing.event,
      stages: [stage("swiss", "pandascore", null)],
    });
    expect(json(await tool("get_event")({ idOrSlug: "cdf" }))).toMatchObject({ editable: false });
  });

  it("creates and updates events through the catalog service", async () => {
    const { tool, catalogService } = setup();
    await tool("create_event")({ name: "CDF 2026" });
    expect(catalogService.createEvent).toHaveBeenCalledWith({ name: "CDF 2026" });
    await tool("update_event")({ eventId: "cdf", name: "Coupe de France Slash 2026" });
    expect(catalogService.updateEvent).toHaveBeenCalledWith("cdf", {
      name: "Coupe de France Slash 2026",
    });
    expect((await tool("update_event")({ eventId: "cdf" })).isError).toBe(true);
  });

  it("maps leagues with their source", async () => {
    const { tool, catalogService } = setup();
    catalogService.leagues.mockResolvedValue([
      Object.assign(new League(), { id: "l1", pandascoreId: 1, name: "RLCS" }),
      Object.assign(new League(), { id: "l2", name: "Coupe de France" }),
    ]);
    expect(json(await tool("list_leagues")({}))).toMatchObject([
      { id: "l1", source: "pandascore" },
      { id: "l2", source: "manual" },
    ]);
  });

  it.each(["create_event", "update_event", "create_league", "update_league"])(
    "%s requires tournaments.manage",
    async (name) => {
      const { tool, catalogService } = setup("journalist");
      const result = await tool(name)({ eventId: "cdf", leagueId: "l1", name: "x" });
      expect(result.isError).toBe(true);
      expect(catalogService.createEvent).not.toHaveBeenCalled();
      expect(catalogService.updateEvent).not.toHaveBeenCalled();
      expect(catalogService.createLeague).not.toHaveBeenCalled();
      expect(catalogService.updateLeague).not.toHaveBeenCalled();
    },
  );
});
