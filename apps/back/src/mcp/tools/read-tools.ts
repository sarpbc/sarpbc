import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NotFoundException } from "@nestjs/common";
import {
  mapMatchListResponse,
  mapNewsAdminArticle,
  mapNewsListItem,
  mapPlayerSummary,
  mapTeamSummary,
  mapTournamentDetail,
  mapTournamentListItem,
} from "../mappers";
import type { McpToolContext } from "../mcp-tool-context";
import { runReadTool, runStaffReadTool } from "../permission-gate";

const SEARCH_LIMIT = 20;
const DEFAULT_MATCH_LIMIT = 20;
const MAX_MATCH_LIMIT = 100;
const DEFAULT_NEWS_LIMIT = 20;
const MAX_NEWS_LIMIT = 100;

async function resolvePlayer(ctx: McpToolContext, idOrSlug: string) {
  const bySlug = await ctx.playerService.findBySlug(idOrSlug);
  if (bySlug) {
    return bySlug;
  }

  const byId = await ctx.playerService.findById(idOrSlug);
  if (byId) {
    return byId;
  }

  throw new NotFoundException(
    `Player "${idOrSlug}" was not found. Try search_players to find the correct slug or id.`,
  );
}

async function resolveTeam(ctx: McpToolContext, idOrSlug: string) {
  const bySlug = await ctx.teamService.findBySlug(idOrSlug);
  const team = await ctx.teamService.getTeamWithPlayers(bySlug?.id ?? idOrSlug);
  if (team) {
    return team;
  }

  throw new NotFoundException(
    `Team "${idOrSlug}" was not found. Try search_teams to find the correct slug or id.`,
  );
}

export function registerReadTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "search_players",
    {
      description:
        'Search Rocket League players by name. Returns matching players with id, slug, team, and public profile URL. When drafting news, use the slug in `:player{slug="…" label="…"}`.',
      inputSchema: {
        query: z.string().min(1).describe("Player name or partial name to search for."),
      },
    },
    async ({ query }) =>
      runReadTool(async () => {
        const players = await ctx.searchService.searchPlayers({
          query,
          limit: SEARCH_LIMIT,
          offset: 0,
        });
        return players.map(mapPlayerSummary);
      }),
  );

  server.registerTool(
    "search_teams",
    {
      description:
        'Search Rocket League teams by name. Returns matching teams with id, slug, and public profile URL. When drafting news, use the slug in `:team{slug="…" label="…"}`.',
      inputSchema: {
        query: z.string().min(1).describe("Team name or partial name to search for."),
      },
    },
    async ({ query }) =>
      runReadTool(async () => {
        const teams = await ctx.searchService.searchTeams({
          query,
          limit: SEARCH_LIMIT,
          offset: 0,
        });
        return teams.map((team) => mapTeamSummary(team));
      }),
  );

  server.registerTool(
    "get_player",
    {
      description:
        "Get a player profile by slug or UUID. Returns core player fields, current team, and the public profile URL.",
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Player slug (e.g. zen-rl) or internal UUID."),
      },
    },
    async ({ idOrSlug }) =>
      runReadTool(async () => {
        const player = await resolvePlayer(ctx, idOrSlug);
        return mapPlayerSummary(player);
      }),
  );

  server.registerTool(
    "get_team",
    {
      description:
        "Get a team profile by slug or UUID, including the current roster when available.",
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Team slug or internal UUID."),
      },
    },
    async ({ idOrSlug }) =>
      runReadTool(async () => {
        const team = await resolveTeam(ctx, idOrSlug);
        return mapTeamSummary(team);
      }),
  );

  server.registerTool(
    "get_tournaments",
    {
      description:
        "List tournaments on sarpbc.org. Use activeOnly to focus on open events with pick'ems still available.",
      inputSchema: {
        activeOnly: z
          .boolean()
          .optional()
          .describe("When true, return only active tournaments (no winner, not ended)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of tournaments to return (default 20)."),
      },
    },
    async ({ activeOnly, limit }) =>
      runReadTool(async () => {
        const [tournaments] = await ctx.tournamentService.find({
          activeOnly: activeOnly ?? false,
          limit: limit ?? 20,
          offset: 0,
        });
        return tournaments.map(mapTournamentListItem);
      }),
  );

  server.registerTool(
    "get_tournament",
    {
      description:
        "Get full tournament detail including bracket matches, participants, and public tournament URL.",
      inputSchema: {
        id: z.string().min(1).describe("Tournament UUID."),
      },
    },
    async ({ id }) =>
      runReadTool(async () => {
        const tournament = await ctx.tournamentService.findById(id);
        if (!tournament) {
          throw new NotFoundException(
            `Tournament "${id}" was not found. Use get_tournaments to list available events.`,
          );
        }
        return mapTournamentDetail(tournament);
      }),
  );

  server.registerTool(
    "get_upcoming_matches",
    {
      description:
        "List upcoming and live matches across tournaments, mirroring the public /matches page.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_MATCH_LIMIT)
          .optional()
          .describe("Maximum matches per category (default 20, max 100)."),
      },
    },
    async ({ limit }) =>
      runReadTool(async () => {
        const searchLimit = Math.min(limit ?? DEFAULT_MATCH_LIMIT, MAX_MATCH_LIMIT);
        const [[upcomingMatches, upcomingTotal], [liveMatches, liveTotal]] = await Promise.all([
          ctx.matchService.findUpcomingAndCount({ limit: searchLimit, offset: 0 }),
          ctx.matchService.findLiveAndCount({ limit: searchLimit, offset: 0 }),
        ]);

        return {
          upcoming: upcomingMatches.map(mapMatchListResponse),
          live: liveMatches.map(mapMatchListResponse),
          upcomingTotal,
          liveTotal,
          total: upcomingTotal + liveTotal,
        };
      }),
  );

  server.registerTool(
    "get_match_results",
    {
      description:
        "List recently finished match results across tournaments, mirroring the public /matches results view.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_MATCH_LIMIT)
          .optional()
          .describe("Maximum number of results to return (default 20, max 100)."),
      },
    },
    async ({ limit }) =>
      runReadTool(async () => {
        const searchLimit = Math.min(limit ?? DEFAULT_MATCH_LIMIT, MAX_MATCH_LIMIT);
        const [results, total] = await ctx.matchService.findResultsAndCount({
          limit: searchLimit,
          offset: 0,
        });

        return {
          results: results.map(mapMatchListResponse),
          total,
        };
      }),
  );

  server.registerTool(
    "list_news_articles",
    {
      description:
        "List news articles including drafts. Requires news.manage. Returns titles and slugs without full body — use get_news_article before editing.",
      inputSchema: {
        page: z.number().int().min(0).optional().describe("0-based page index (default 0)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_NEWS_LIMIT)
          .optional()
          .describe(`Page size (default ${DEFAULT_NEWS_LIMIT}, max ${MAX_NEWS_LIMIT}).`),
      },
    },
    async ({ page, limit }) =>
      runStaffReadTool(user, "news.manage", async () => {
        const result = await ctx.newsService.findAll(page ?? 0, limit ?? DEFAULT_NEWS_LIMIT);
        return {
          data: result.data.map(mapNewsListItem),
          total: result.total,
          page: result.page,
          limit: result.limit,
        };
      }),
  );

  server.registerTool(
    "get_news_article",
    {
      description:
        "Get a news article by slug or UUID, including unpublished drafts and both English and French fields. Requires news.manage. Use this before update_news_article.",
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Article slug (e.g. zen-joins-karmine-corp) or UUID."),
      },
    },
    async ({ idOrSlug }) =>
      runStaffReadTool(user, "news.manage", async () => {
        const article = await ctx.newsService.findOneAdminByIdOrSlug(idOrSlug);
        return mapNewsAdminArticle(article);
      }),
  );
}
