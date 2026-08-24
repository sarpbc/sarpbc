import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BadRequestException } from "@nestjs/common";
import type { McpToolContext } from "../mcp-tool-context";
import { runWriteTool } from "../permission-gate";
import { adminNewsEditUrl, matchUrl, tournamentUrl } from "../urls";
import { CreateTournamentDto, UpdateTournamentDto } from "src/tournament/dto/create-tournament.dto";
import { parseDto } from "src/tournament/dto/parse-tournament-dto";

const matchResultSchema = z.object({
  participantId: z.string().nullable(),
  score: z.number(),
});

const tournamentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();

const nullableTournamentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional();

export function requireNewsUpdateFields(fields: {
  title?: string;
  content?: string;
  titleFr?: string | null;
  contentFr?: string | null;
  imageUrl?: string | null;
  slug?: string;
}): void {
  if (
    fields.title === undefined &&
    fields.content === undefined &&
    fields.titleFr === undefined &&
    fields.contentFr === undefined &&
    fields.imageUrl === undefined &&
    fields.slug === undefined
  ) {
    throw new BadRequestException(
      "Provide at least one field to update (title, content, titleFr, contentFr, imageUrl, or slug).",
    );
  }
}

export function registerWriteTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "create_news_draft",
    {
      description:
        'Create a news article draft. Requires news.manage. Write the English title and body. Optionally add French title and body so /fr readers see French. When mentioning a player or team, you MUST use the custom MDC components `:player{slug="…" label="…"}` and `:team{slug="…" label="…"}` — resolve slugs with search_players / search_teams first, and do not use plain names when a slug exists. A human must review and publish it in the admin app.',
      inputSchema: {
        title: z.string().min(1).describe("English article headline."),
        content: z
          .string()
          .min(1)
          .describe(
            'English article body in markdown. Mention players with `:player{slug="<slug>" label="<name>"}` and teams with `:team{slug="<slug>" label="<name>"}`.',
          ),
        titleFr: z.string().min(1).optional().describe("Optional French headline."),
        contentFr: z
          .string()
          .min(1)
          .optional()
          .describe("Optional French body in markdown. Use the same player/team tags as English."),
        imageUrl: z.string().url().optional().describe("Optional cover image URL."),
        slug: z
          .string()
          .min(1)
          .optional()
          .describe("Optional URL slug. Generated from the English title when omitted."),
      },
    },
    async ({ title, content, titleFr, contentFr, imageUrl, slug }) =>
      runWriteTool(user, "create_news_draft", "news.manage", async () => {
        const article = await ctx.newsService.create(
          { title, content, titleFr, contentFr, imageUrl, slug },
          user.id,
        );
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
    "update_news_article",
    {
      description:
        'Update an existing news article. Requires news.manage. Pass only the fields to change. Pass null for titleFr, contentFr, or imageUrl to clear them. Does not publish — a human must review and publish in the admin app. When mentioning a player or team, you MUST use `:player{slug="…" label="…"}` and `:team{slug="…" label="…"}`.',
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Current article slug or UUID."),
        title: z.string().min(1).max(255).optional().describe("Updated English headline."),
        content: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Updated English body in markdown. Mention players with `:player{slug="<slug>" label="<name>"}` and teams with `:team{slug="<slug>" label="<name>"}`.',
          ),
        titleFr: z
          .string()
          .min(1)
          .max(255)
          .nullable()
          .optional()
          .describe("Updated French headline, or null to clear."),
        contentFr: z
          .string()
          .min(1)
          .nullable()
          .optional()
          .describe("Updated French body in markdown, or null to clear."),
        imageUrl: z
          .string()
          .url()
          .nullable()
          .optional()
          .describe("Updated cover image URL, or null to clear."),
        slug: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe("New URL slug. Leave omitted to keep the current slug."),
      },
    },
    async ({ idOrSlug, title, content, titleFr, contentFr, imageUrl, slug }) =>
      runWriteTool(user, "update_news_article", "news.manage", async () => {
        requireNewsUpdateFields({ title, content, titleFr, contentFr, imageUrl, slug });

        const current = await ctx.newsService.findOneAdminByIdOrSlug(idOrSlug);
        const article = await ctx.newsService.update(current.slug, {
          title,
          content,
          titleFr,
          contentFr,
          imageUrl,
          slug,
        });

        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            hasFrench: article.hasFrench,
            adminEditUrl: adminNewsEditUrl(article.slug),
            note: "Article updated. Publishing remains a human action in the admin app.",
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
        name: z.string().min(1).max(255).describe("Tournament display name."),
        slug: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe("Optional URL slug. Generated from the name when omitted."),
        tier: z
          .string()
          .max(50)
          .optional()
          .describe("Optional competitive tier label (e.g. S-Tier)."),
        leagueId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional league UUID from get_tournaments listings."),
        beginAt: tournamentDateSchema.describe("Start date (YYYY-MM-DD)."),
        endAt: tournamentDateSchema.describe("End date (YYYY-MM-DD)."),
        imageUrl: z.string().url().max(255).optional().describe("Optional cover image URL."),
        teamIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Team UUIDs to register as participants. Use search_teams to find ids."),
      },
    },
    async (input) =>
      runWriteTool(user, "create_tournament", "tournaments.manage", async () => {
        const dto = await parseDto(CreateTournamentDto, input);
        const tournament = await ctx.manualTournamentService.create(dto);

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
        name: z.string().min(1).max(255).optional().describe("Tournament display name."),
        slug: z.string().min(1).max(255).optional().describe("URL slug."),
        tier: z
          .string()
          .max(50)
          .nullable()
          .optional()
          .describe("Competitive tier label, or null to clear."),
        leagueId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe("League UUID, or null to clear the league."),
        beginAt: nullableTournamentDateSchema.describe("Start date (YYYY-MM-DD), or null."),
        endAt: nullableTournamentDateSchema.describe("End date (YYYY-MM-DD), or null."),
        imageUrl: z
          .string()
          .url()
          .max(255)
          .nullable()
          .optional()
          .describe("Cover image URL, or null."),
        teamIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Replace participating teams with this list of team UUIDs."),
      },
    },
    async ({ tournamentId, ...input }) =>
      runWriteTool(user, "update_tournament", "tournaments.manage", async () => {
        const dto = await parseDto(UpdateTournamentDto, input);
        const tournament = await ctx.manualTournamentService.update(tournamentId, dto);

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
        "Trigger a PandaScore sync. Requires tournaments.manage. Pass tournamentId to sync one local event, or omit to discover missing tournaments (reconcile past/upcoming/running) then run additions.",
      inputSchema: {
        tournamentId: z
          .string()
          .min(1)
          .optional()
          .describe("Local tournament UUID to sync. Omit to run the global new-tournament sync."),
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

        const sync = await ctx.tournamentService.syncNewTournamentsFromPandascore();
        return {
          result: {
            success: true,
            scope: "new_tournaments",
            sync,
          },
        };
      }),
  );

  server.registerTool(
    "sync_pandascore_tournament",
    {
      description:
        "Import or refresh a tournament by its PandaScore numeric ID (e.g. 21623 for EWC 2026 Group A). Requires tournaments.manage. Use when a tournament exists on PandaScore but is missing from sarpbc.",
      inputSchema: {
        pandascoreId: z
          .number()
          .int()
          .positive()
          .describe("PandaScore tournament id (from api.pandascore.co /tournaments/:id)."),
      },
    },
    async ({ pandascoreId }) =>
      runWriteTool(user, "sync_pandascore_tournament", "tournaments.manage", async () => {
        const tournamentId = await ctx.tournamentService.syncTournamentByPandascoreId(pandascoreId);
        return {
          entityId: tournamentId,
          result: {
            success: true,
            tournamentId,
            pandascoreId,
            url: tournamentUrl(tournamentId),
          },
        };
      }),
  );
}
