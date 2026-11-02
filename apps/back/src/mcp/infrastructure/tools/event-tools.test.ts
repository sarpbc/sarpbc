import { describe, expect, it, vi } from "vitest";
import { League, Tournament } from "../../../tournament/domain/competition";
import { TournamentEvent } from "../../../tournament/domain/tournament-event";
import type { DataSource } from "../../../common/domain/data-source";
import { registerEventTools } from "./event-tools";

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

interface ToolInput {
  idOrSlug?: string;
  eventId?: string;
  leagueId?: string;
  name?: string;
}

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
  const registerTool = vi.fn();
  registerEventTools(
    { registerTool } as never,
    {
      user: { id: "u1", email: "staff@test.com", role },
      catalogService,
      eventService: { list: vi.fn().mockResolvedValue([[listing], 1]) },
    } as never,
  );
  const tool = (name: string) => {
    const call = registerTool.mock.calls.find((c) => c[0] === name);
    if (!call) throw new Error(`${name} is not registered`);
    return (input: ToolInput) => call[2](input);
  };
  return { catalogService, tool, listing };
}

const json = (result: { content: Array<{ text: string }> }) => JSON.parse(result.content[0].text);

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
