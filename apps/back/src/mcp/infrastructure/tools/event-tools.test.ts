import { describe, expect, it, vi } from "vitest";
import { jsonOf as json } from "../../../../test/mcp-result";
import type { TournamentPlayerStatsService } from "../../../match-stats/application/tournament-player-stats.service";
import type { MatchService } from "../../../tournament/application/match/match.service";
import type { MatchLineupService } from "../../../tournament/application/match/match-lineup.service";
import type { PlayerAwardService } from "../../../tournament/application/player-award.service";
import type { EventQueries, TournamentQueries } from "../../../tournament/application/ports";
import type { TournamentPrizeService } from "../../../tournament/application/tournament-prize.service";
import { League } from "../../../tournament/domain/league";
import { Tournament } from "../../../tournament/domain/tournament";
import { TournamentEvent } from "../../../tournament/domain/tournament-event";
import type { DataSource } from "@sarpbc/types";
import { competitionReads } from "../competition-reads";
import { eventTools } from "./event-tools";
import { FakeCatalog } from "./fake-catalog.test-utils";
import type { Listing } from "./fake-catalog.test-utils";

const EVENT_ID = "0b6f2d3e-6c1a-4b8e-9a51-2f7c3d4e5a6b";

const stage = (id: string, source: DataSource, beginAt: string | null) =>
  Object.assign(new Tournament(), {
    beginAt: beginAt === null ? null : new Date(beginAt),
    endAt: beginAt === null ? null : new Date(beginAt),
    event: { id: "cdf", name: "CDF 2026", slug: "cdf-2026" },
    id,
    name: id,
    slug: id,
    source,
    tier: "B",
  });

interface ToolInput extends Record<string, unknown> {
  idOrSlug?: string;
  eventId?: string;
  leagueId?: string;
  name?: string;
}

const recordingEventQueries = (listing: Listing) => {
  const requests: Parameters<EventQueries["list"]>[0][] = [];

  return {
    list: async (query: Parameters<EventQueries["list"]>[0]) => {
      requests.push(query);

      return [[listing], 1] satisfies Awaited<ReturnType<EventQueries["list"]>>;
    },
    requests,
  } satisfies Pick<EventQueries, "list"> & { requests: unknown[] };
};

const setup = (role: "admin" | "journalist" = "admin") => {
  vi.stubEnv("FRONT_URL", "https://sarpbc.test");

  const event = Object.assign(new TournamentEvent(), {
    id: "cdf",
    name: "CDF 2026",
    slug: "cdf-2026",
  });

  const listing = {
    event,
    stages: [
      stage("finals", "manual", "2026-11-12T18:00:00Z"),
      stage("pool", "manual", "2026-11-05T18:00:00Z"),
    ],
  };

  const catalogService = new FakeCatalog(listing);
  const eventQueries = recordingEventQueries(listing);

  const tools = eventTools({
    catalogService,
    competition: competitionReads({
      catalogService,
      events: eventQueries,
      matchLineupService: { find: vi.fn<MatchLineupService["find"]>() },
      matchService: { list: vi.fn<MatchService["list"]>() },
      playerAwardService: {
        findByTournamentId: vi.fn<PlayerAwardService["findByTournamentId"]>(),
      },
      tournamentPlayerStatsService: {
        forStages: vi.fn<TournamentPlayerStatsService["forStages"]>(),
      },
      tournamentPrizeService: {
        findByTournamentId: vi.fn<TournamentPrizeService["findByTournamentId"]>(),
        playerEarnings: vi.fn<TournamentPrizeService["playerEarnings"]>(),
        teamEarnings: vi.fn<TournamentPrizeService["teamEarnings"]>(),
      },
      tournaments: {
        find: vi.fn<TournamentQueries["find"]>(),
        findById: vi.fn<TournamentQueries["findById"]>(),
      },
    }),
  });

  const tool = (name: string) => {
    const found = tools.find((candidate) => candidate.name === name);

    if (!found) {
      throw new Error(`${name} is not defined`);
    }

    return async (input: ToolInput) =>
      await found.run({ email: "staff@test.com", id: "u1", role }, input);
  };

  return { catalogService, eventQueries, listing, tool };
};

describe("event tools", () => {
  it("returns an event's stages earliest first with its overall dates", async () => {
    const { tool } = setup();
    expect(json(await tool("get_event")({ idOrSlug: "cdf-2026" }))).toMatchObject({
      beginAt: "2026-11-05T18:00:00.000Z",
      editable: true,
      endAt: "2026-11-12T18:00:00.000Z",
      id: "cdf",
      stages: [
        { id: "pool", tier: "B", url: "https://sarpbc.test/tournaments/cdf-2026/pool" },
        { id: "finals" },
      ],
      url: "https://sarpbc.test/tournaments/cdf-2026",
    });
  });

  it("returns an event without stages", async () => {
    const { tool, catalogService, listing } = setup();
    catalogService.listing = { event: listing.event, stages: [] };
    expect(json(await tool("get_event")({ idOrSlug: "cdf" }))).toMatchObject({ stages: [] });
  });

  it("lists events with the default page", async () => {
    const { tool, eventQueries } = setup();
    await tool("list_events")({});
    expect(eventQueries.requests).toStrictEqual([{ activeOnly: false, limit: 20, offset: 0 }]);
  });

  it("reports synced events as not editable", async () => {
    const { tool, catalogService, listing } = setup();
    catalogService.listing = {
      event: listing.event,
      stages: [stage("swiss", "pandascore", null)],
    };
    expect(json(await tool("get_event")({ idOrSlug: "cdf" }))).toMatchObject({ editable: false });
  });

  it("creates and updates events through the catalog service", async () => {
    const { tool, catalogService } = setup();
    await tool("create_event")({ name: "CDF 2026" });
    expect(catalogService.createdEvents).toStrictEqual([{ name: "CDF 2026" }]);
    await tool("update_event")({ eventId: EVENT_ID, name: "Coupe de France Slash 2026" });
    expect(catalogService.updatedEvents).toStrictEqual([
      { id: EVENT_ID, input: { name: "Coupe de France Slash 2026" } },
    ]);
    const awaited2 = await tool("update_event")({ eventId: EVENT_ID });
    expect(awaited2.isError).toBe(true);
  });

  it("maps leagues with their source", async () => {
    const { tool, catalogService } = setup();
    catalogService.leagueList = [
      Object.assign(new League(), { id: "l1", name: "RLCS", pandascoreId: 1 }),
      Object.assign(new League(), { id: "l2", name: "Coupe de France" }),
    ];
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
      expect(catalogService.createdEvents).toStrictEqual([]);
      expect(catalogService.updatedEvents).toStrictEqual([]);
      expect(catalogService.createdLeagues).toStrictEqual([]);
      expect(catalogService.updatedLeagues).toStrictEqual([]);
    },
  );
});
