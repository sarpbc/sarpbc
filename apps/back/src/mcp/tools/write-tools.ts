import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { McpToolContext } from "../mcp-tool-context";
import { runWriteTool } from "../permission-gate";
import { adminNewsEditUrl, matchUrl } from "../urls";

const matchResultSchema = z.object({
  participantId: z.string().nullable(),
  score: z.number(),
});

const previousMatchSchema = z.object({
  type: z.enum(["winner", "loser"]),
  match_id: z.number(),
});

export function registerWriteTools(server: McpServer, ctx: McpToolContext): void {
  const { user, userService } = ctx;

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
      runWriteTool(userService, user.id, "create_news_draft", "news.manage", async () => {
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
        "Create or update a tournament match. Requires tournaments.manage. Mirrors POST /tournaments/:id/matches.",
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
        pandascoreId: z.number().int().optional().describe("PandaScore match id for sync upserts."),
        results: z
          .array(matchResultSchema)
          .optional()
          .describe("Per-participant scores. Sets the winner when status is finished."),
        previous_matches: z
          .array(previousMatchSchema)
          .optional()
          .describe("Bracket links to previous matches by PandaScore match id."),
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
      pandascoreId,
      results,
      previous_matches,
    }) =>
      runWriteTool(userService, user.id, "create_match", "tournaments.manage", async () => {
        const match = await ctx.matchService.upsertMatch(tournamentId, {
          name,
          slug,
          beginAt: beginAt ? new Date(beginAt) : undefined,
          endAt: endAt ? new Date(endAt) : undefined,
          status,
          numberOfGames,
          participantIds,
          pandascoreId,
          results,
          previous_matches,
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
      runWriteTool(userService, user.id, "set_match_winner", "tournaments.manage", async () => {
        const match = await ctx.matchService.setMatchWinner(matchId, winnerId);
        return {
          entityId: matchId,
          result: {
            id: match?.id ?? matchId,
            winnerId,
            url: matchUrl(matchId),
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
      runWriteTool(
        userService,
        user.id,
        "trigger_tournament_sync",
        "tournaments.manage",
        async () => {
          if (tournamentId) {
            await ctx.tournamentService.syncTournamentFromPandascore(tournamentId);
            await ctx.redisService.delete(`tournament:${tournamentId}`);
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
        },
      ),
  );
}
