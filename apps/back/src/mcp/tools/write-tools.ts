import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpToolContext } from "../mcp-tool-context";
import { runWriteTool } from "../permission-gate";
import { adminNewsEditUrl, matchUrl, tournamentUrl } from "../urls";

const matchResultSchema = z.object({
  participantId: z.string().nullable(),
  score: z.number(),
});

export function registerWriteTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "create_news_draft",
    {
      description:
        "Create a news article draft. Requires news.manage. A human must review and publish it in the admin app.",
      inputSchema: {
        title: z.string().min(1).describe("Article headline."),
        content: z.string().min(1).describe("Article body (plain text or markdown)."),
        imageUrl: z.string().url().optional().describe("Optional cover image URL."),
        slug: z
          .string()
          .min(1)
          .optional()
          .describe("Optional URL slug. Generated from the title when omitted."),
      },
    },
    async ({ title, content, imageUrl, slug }) =>
      runWriteTool(user, "create_news_draft", "news.manage", async () => {
        const article = await ctx.newsService.create({ title, content, imageUrl, slug }, user.id);
        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            adminEditUrl: adminNewsEditUrl(article.slug),
            note: "Draft created. A staff member must review and publish it in the admin app.",
          },
        };
      }),
  );

  server.registerTool(
    "create_match",
    {
      description:
        "Create a tournament match between existing tournament participants. Requires tournaments.manage.",
      inputSchema: {
        tournamentId: z.string().min(1).describe("Tournament UUID the match belongs to."),
        name: z.string().min(1).describe("Match display name."),
        slug: z.string().optional().describe("Optional URL slug for the match."),
        beginAt: z.string().optional().describe("Scheduled start time (ISO 8601 date string)."),
        endAt: z.string().optional().describe("Scheduled or actual end time (ISO 8601)."),
        status: z
          .string()
          .optional()
          .describe("Match status (e.g. not_started, running, finished)."),
        numberOfGames: z.number().int().optional().describe("Best-of series length."),
        participantIds: z
          .array(z.string().min(1))
          .min(2)
          .describe("Tournament participant UUIDs (at least two)."),
        results: z
          .array(matchResultSchema)
          .optional()
          .describe("Per-participant scores. Sets the winner when status is finished."),
      },
    },
    async ({
      tournamentId,
      name,
      slug,
      beginAt,
      endAt,
      status,
      numberOfGames,
      participantIds,
      results,
    }) =>
      runWriteTool(user, "create_match", "tournaments.manage", async () => {
        const match = await ctx.matchService.upsertMatch(tournamentId, {
          name,
          slug,
          beginAt: beginAt ? new Date(beginAt) : undefined,
          endAt: endAt ? new Date(endAt) : undefined,
          status,
          numberOfGames,
          participantIds,
          results,
        });

        return {
          entityId: match.id,
          result: {
            id: match.id,
            name: match.name,
            tournamentId,
            url: matchUrl(match.id),
          },
        };
      }),
  );

  server.registerTool(
    "set_match_winner",
    {
      description:
        "Set the winner of a finished match by tournament participant id. Requires tournaments.manage.",
      inputSchema: {
        matchId: z.string().min(1).describe("Match UUID."),
        winnerId: z.string().min(1).describe("Tournament participant UUID of the winning team."),
      },
    },
    async ({ matchId, winnerId }) =>
      runWriteTool(user, "set_match_winner", "tournaments.manage", async () => {
        const match = await ctx.matchService.setMatchWinner(matchId, winnerId);
        return {
          entityId: match.id,
          result: {
            id: match.id,
            winnerId,
            url: matchUrl(match.id),
          },
        };
      }),
  );

  server.registerTool(
    "create_tournament",
    {
      description:
        "Create a manual tournament on sarpbc.org. Requires tournaments.manage. PandaScore-synced tournaments cannot be created through this tool.",
      inputSchema: {
        name: z.string().min(1).describe("Tournament display name."),
        slug: z
          .string()
          .min(1)
          .optional()
          .describe("Optional URL slug. Generated from the name when omitted."),
        tier: z.string().optional().describe("Optional competitive tier label (e.g. S-Tier)."),
        leagueId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional league UUID from get_tournaments listings."),
        beginAt: z.string().optional().describe("Start date (YYYY-MM-DD)."),
        endAt: z.string().optional().describe("End date (YYYY-MM-DD)."),
        imageUrl: z.string().url().optional().describe("Optional cover image URL."),
        teamIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Team UUIDs to register as participants. Use search_teams to find ids."),
      },
    },
    async ({ name, slug, tier, leagueId, beginAt, endAt, imageUrl, teamIds }) =>
      runWriteTool(user, "create_tournament", "tournaments.manage", async () => {
        const tournament = await ctx.tournamentService.createManual({
          name,
          slug,
          tier,
          leagueId,
          beginAt,
          endAt,
          imageUrl,
          teamIds,
        });

        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            source: tournament.source,
            url: tournamentUrl(tournament.id),
          },
        };
      }),
  );

  server.registerTool(
    "update_tournament",
    {
      description:
        "Update a manual tournament. Requires tournaments.manage. PandaScore-synced tournaments are rejected.",
      inputSchema: {
        tournamentId: z.string().min(1).describe("Tournament UUID to update."),
        name: z.string().min(1).optional().describe("Tournament display name."),
        slug: z.string().min(1).optional().describe("URL slug."),
        tier: z.string().optional().describe("Competitive tier label."),
        leagueId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe("League UUID, or null to clear the league."),
        beginAt: z.string().nullable().optional().describe("Start date (YYYY-MM-DD), or null."),
        endAt: z.string().nullable().optional().describe("End date (YYYY-MM-DD), or null."),
        imageUrl: z.string().url().nullable().optional().describe("Cover image URL, or null."),
        teamIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Replace participating teams with this list of team UUIDs."),
      },
    },
    async ({ tournamentId, name, slug, tier, leagueId, beginAt, endAt, imageUrl, teamIds }) =>
      runWriteTool(user, "update_tournament", "tournaments.manage", async () => {
        const tournament = await ctx.tournamentService.updateManual(tournamentId, {
          name,
          slug,
          tier,
          leagueId,
          beginAt,
          endAt,
          imageUrl,
          teamIds,
        });

        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            source: tournament.source,
            url: tournamentUrl(tournament.id),
          },
        };
      }),
  );

  server.registerTool(
    "trigger_tournament_sync",
    {
      description:
        "Trigger a PandaScore sync. Requires tournaments.manage. Pass tournamentId to sync one event, or omit to sync new additions.",
      inputSchema: {
        tournamentId: z
          .string()
          .min(1)
          .optional()
          .describe("Tournament UUID to sync. Omit to run the global additions sync."),
      },
    },
    async ({ tournamentId }) =>
      runWriteTool(user, "trigger_tournament_sync", "tournaments.manage", async () => {
        if (tournamentId) {
          await ctx.tournamentService.syncTournamentFromPandascore(tournamentId);
          return {
            entityId: tournamentId,
            result: {
              success: true,
              tournamentId,
              scope: "single",
            },
          };
        }

        await ctx.tournamentService.syncPandascoreAdditions();
        return {
          result: {
            success: true,
            scope: "additions",
          },
        };
      }),
  );
}
