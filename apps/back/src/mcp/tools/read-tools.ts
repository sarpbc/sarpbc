import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { NotFoundException } from "@nestjs/common";
import {
  mapMatchListResponse,
  mapPlayerSummary,
  mapTeamSummary,
  mapTournamentDetail,
  mapTournamentListItem,
} from "../mappers";
import type { McpToolContext } from "../mcp-tool-context";
import { runReadTool } from "../permission-gate";

const SEARCH_LIMIT = 20;
const DEFAULT_MATCH_LIMIT = 20;
const MAX_MATCH_LIMIT = 100;

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
  if (bySlug) {
    const withPlayers = await ctx.teamService.getTeamWithPlayers(bySlug.id);
    return withPlayers ?? bySlug;
  }

  const byId = await ctx.teamService.getTeamWithPlayers(idOrSlug);
  if (byId) {
    return byId;
  }

  const team = await ctx.teamService.findById(idOrSlug);
  if (team) {
    return team;
  }

  throw new NotFoundException(
    `Team "${idOrSlug}" was not found. Try search_teams to find the correct slug or id.`,
  );
}

export function registerReadTools(server: McpServer, ctx: McpToolContext): void {
  server.registerTool(
    "search_players",
    {
      description:
        "Search Rocket League players by name. Returns matching players with id, slug, team, and public profile URL.",
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
        "Search Rocket League teams by name. Returns matching teams with id, slug, and public profile URL.",
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
        const tournaments = await ctx.tournamentService.find({
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
}
