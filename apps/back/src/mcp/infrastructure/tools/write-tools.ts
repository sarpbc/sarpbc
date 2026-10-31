import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BadRequestException } from "@nestjs/common";
import { NEWS_TYPES } from "@sarpbc/types";
import type { McpToolContext } from "../mcp-tool-context";
import { runWriteTool } from "../permission-gate";
import { adminNewsEditUrl, matchUrl, tournamentUrl } from "../urls";
import {
  CreateTournamentDto,
  UpdateTournamentDto,
} from "../../../tournament/infrastructure/http/dto/create-tournament.dto";
import { parseDto } from "../../../tournament/infrastructure/http/dto/parse-tournament-dto";
import { matchPublicSlug } from "../../../tournament/domain/competition";
import { MAX_VODS_PER_GAME } from "@sarpbc/utils";
import { mapMatchListResponse } from "../mappers";
import { requireUpdateFields } from "./update-fields";

const MATCH_BLOCK_FORMAT =
  'Embed live match scores with a match block on its own line, using match, tournament or team UUIDs from get_tournament, get_upcoming_matches, get_match_results or search_teams: `:matches{match="<match id>"}` for one match, `:matches{ids="<match id>,<match id>"}` for a manual selection (up to 10, in that order), `:matches{tournament="<tournament id>" limit="5"}` or `:matches{team="<team id>" limit="5"}` for live, then upcoming, then latest matches (limit 1-10, default 5). Use the same block in English and French bodies.';

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
  type?: (typeof NEWS_TYPES)[number];
}): void {
  if (
    fields.title === undefined &&
    fields.content === undefined &&
    fields.titleFr === undefined &&
    fields.contentFr === undefined &&
    fields.imageUrl === undefined &&
    fields.slug === undefined &&
    fields.type === undefined
  ) {
    throw new BadRequestException(
      "Provide at least one field to update (title, content, titleFr, contentFr, imageUrl, slug, or type).",
    );
  }
}

export function registerWriteTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "create_news_draft",
    {
      description:
        'Create a news article draft. Requires news.manage. Write the English title and body. Optionally add French title and body so /fr readers see French. When mentioning a player or team, you MUST use the custom MDC components `:player{slug="…" label="…"}` and `:team{slug="…" label="…"}` — resolve slugs with search_players / search_teams first, and do not use plain names when a slug exists. When the primary source is an X/Twitter post, put `:tweet{url="https://x.com/…/status/…"}` on its own line in both English and French bodies (same URL). ' +
        MATCH_BLOCK_FORMAT +
        " A human must review and publish it in the admin app.",
      inputSchema: {
        title: z.string().min(1).describe("English article headline."),
        content: z
          .string()
          .min(1)
          .describe(
            'English article body in markdown. Mention players with `:player{slug="<slug>" label="<name>"}` and teams with `:team{slug="<slug>" label="<name>"}`. Embed X posts with `:tweet{url="https://x.com/<handle>/status/<id>"}` on its own line. ' +
              MATCH_BLOCK_FORMAT,
          ),
        titleFr: z.string().min(1).optional().describe("Optional French headline."),
        contentFr: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional French body in markdown. Use the same player/team/tweet/match tags as English.",
          ),
        imageUrl: z.string().url().optional().describe("Optional cover image URL."),
        slug: z
          .string()
          .min(1)
          .optional()
          .describe("Optional URL slug. Generated from the English title when omitted."),
        type: z
          .enum(NEWS_TYPES)
          .optional()
          .describe(
            "short = follow the scene (results, rosters, announcements). article = understand the scene (analysis, context, stories). Defaults to short.",
          ),
      },
    },
    async ({ title, content, titleFr, contentFr, imageUrl, slug, type }) =>
      runWriteTool(user, "create_news_draft", "news.manage", async () => {
        const article = await ctx.newsService.create(
          { title, content, titleFr, contentFr, imageUrl, slug, type },
          user.id,
        );
        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            type: article.type,
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
        'Update an existing news article. Requires news.manage. Pass only the fields to change. Pass null for titleFr, contentFr, or imageUrl to clear them. Does not publish — a human must review and publish in the admin app. When mentioning a player or team, you MUST use `:player{slug="…" label="…"}` and `:team{slug="…" label="…"}`. Embed X posts with `:tweet{url="https://x.com/…/status/…"}` on its own line. ' +
        MATCH_BLOCK_FORMAT,
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Current article slug or UUID."),
        title: z.string().min(1).max(255).optional().describe("Updated English headline."),
        content: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Updated English body in markdown. Mention players with `:player{slug="<slug>" label="<name>"}` and teams with `:team{slug="<slug>" label="<name>"}`. Embed X posts with `:tweet{url="https://x.com/<handle>/status/<id>"}` on its own line. ' +
              MATCH_BLOCK_FORMAT,
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
          .describe(
            "Updated French body in markdown, or null to clear. Keep the same tweet and match tags.",
          ),
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
        type: z
          .enum(NEWS_TYPES)
          .optional()
          .describe(
            "short = follow the scene (results, rosters, announcements). article = understand the scene (analysis, context, stories).",
          ),
      },
    },
    async ({ idOrSlug, title, content, titleFr, contentFr, imageUrl, slug, type }) =>
      runWriteTool(user, "update_news_article", "news.manage", async () => {
        requireNewsUpdateFields({ title, content, titleFr, contentFr, imageUrl, slug, type });

        const current = await ctx.newsService.findOneAdminByIdOrSlug(idOrSlug);
        const article = await ctx.newsService.update(current.slug, {
          title,
          content,
          titleFr,
          contentFr,
          imageUrl,
          slug,
          type,
        });

        return {
          entityId: article.id,
          result: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            isDraft: article.isDraft,
            hasFrench: article.hasFrench,
            type: article.type,
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
            url: matchUrl(match.publicId, matchPublicSlug(match)),
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
            url: matchUrl(match.publicId, matchPublicSlug(match)),
          },
        };
      }),
  );

  server.registerTool(
    "set_match_game_vods",
    {
      description:
        "Replace the VOD links of one game of a match (any source, PandaScore included). Requires tournaments.manage. Links are https twitch.tv, youtube.com or youtu.be URLs, optionally timestamped with t= (seconds or 1h2m3s); the source is derived from the host. Pass an empty list to clear the game. Returns every VOD link of the match.",
      inputSchema: {
        matchId: z.string().min(1).describe("Match UUID."),
        game: z.number().int().min(1).describe("Game number in the series, starting at 1."),
        links: z
          .array(
            z.object({
              url: z.string().min(1).max(2048).describe("https VOD URL, optionally with t=."),
              language: z
                .string()
                .min(2)
                .max(2)
                .describe("ISO 639-1 language of the broadcast (e.g. en, fr, de, es)."),
              source: z
                .enum(["twitch", "youtube"])
                .optional()
                .describe("Must match the URL host when given."),
            }),
          )
          .max(MAX_VODS_PER_GAME)
          .describe("VOD links for this game; replaces the existing ones."),
      },
    },
    async ({ matchId, game, links }) =>
      runWriteTool(user, "set_match_game_vods", "tournaments.manage", async () => {
        const match = await ctx.matchService.setGameVods(matchId, game, links);
        return {
          entityId: match.id,
          result: {
            id: match.id,
            vods: match.vods,
            url: matchUrl(match.publicId, matchPublicSlug(match)),
          },
        };
      }),
  );

  server.registerTool(
    "update_match",
    {
      description:
        "Correct the score, status, or dates of a manual match (pandascoreId is null). Requires tournaments.manage. Scores replace all existing scores; on a finished match they also set the winner. A status other than finished clears the winner.",
      inputSchema: {
        matchId: z.string().min(1).describe("Match UUID."),
        beginAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional()
          .describe("Start time (ISO 8601), or null."),
        endAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .optional()
          .describe("End time (ISO 8601), or null."),
        status: z.enum(["not_started", "running", "finished"]).optional().describe("Match status."),
        results: z
          .array(z.object({ participantId: z.string().min(1), score: z.number().int().min(0) }))
          .min(2)
          .optional()
          .describe("Score of every match participant, keyed by tournament participant UUID."),
      },
    },
    async ({ matchId, beginAt, endAt, status, results }) =>
      runWriteTool(user, "update_match", "tournaments.manage", async () => {
        requireUpdateFields({ beginAt, endAt, status, results });
        const toDate = (value: string | null | undefined) =>
          value === undefined ? undefined : value === null ? null : new Date(value);
        const match = await ctx.matchService.updateMatch(matchId, {
          beginAt: toDate(beginAt),
          endAt: toDate(endAt),
          status,
          results,
        });
        return { entityId: match.id, result: mapMatchListResponse(match) };
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
          .describe("Optional event URL slug. Generated from the name when omitted."),
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
        source: z
          .enum(["manual", "startgg"])
          .optional()
          .describe(
            "startgg when the data comes from start.gg; MCP reads then never return it. Defaults to manual.",
          ),
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
            url: tournamentUrl(tournament),
          },
        };
      }),
  );

  server.registerTool(
    "update_tournament",
    {
      description:
        "Update a tournament. Requires tournaments.manage. For PandaScore-synced tournaments, send only imageUrl and/or endAt; all other fields are managed by the sync. An endAt sent on a synced tournament is kept as a staff correction that the sync no longer overwrites (closes a stage PandaScore left open); pass endAt null to hand the end date back to the sync. Manual tournaments accept all listed fields.",
      inputSchema: {
        tournamentId: z.string().min(1).describe("Tournament UUID to update."),
        name: z.string().min(1).max(255).optional().describe("Tournament display name."),
        slug: z.string().min(1).max(255).optional().describe("Event URL slug."),
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
            imageUrl: tournament.imageUrl,
            endAt: tournament.endAt,
            url: tournamentUrl(tournament),
          },
        };
      }),
  );

  server.registerTool(
    "link_pandascore_tournament",
    {
      description:
        "Link a manual tournament to its PandaScore tournament when the sync did not match it automatically. Requires tournaments.manage. The manual tournament becomes the synced stage (keeping its id, URLs and image) and PandaScore fills its details and matches, so no duplicate is created. Fails if that PandaScore tournament is already imported as another tournament.",
      inputSchema: {
        tournamentId: z.string().uuid().describe("Manual tournament UUID to link."),
        pandascoreId: z
          .number()
          .int()
          .positive()
          .describe("PandaScore tournament id (from api.pandascore.co /tournaments/:id)."),
      },
    },
    async ({ tournamentId, pandascoreId }) =>
      runWriteTool(user, "link_pandascore_tournament", "tournaments.manage", async () => {
        const tournament = await ctx.tournamentService.linkPandascoreTournament(
          tournamentId,
          pandascoreId,
        );
        return {
          entityId: tournament.id,
          result: {
            id: tournament.id,
            name: tournament.name,
            source: tournament.source,
            pandascoreId: tournament.pandascoreId,
            url: tournamentUrl(tournament),
          },
        };
      }),
  );

  server.registerTool(
    "trigger_tournament_sync",
    {
      description:
        "Trigger a PandaScore sync. Requires tournaments.manage. Pass tournamentId to sync one local event, or omit to discover missing tournaments (reconcile past/upcoming/running) then apply PandaScore incidents (creations and updates).",
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
        const tournament = await ctx.tournamentService.syncTournamentByPandascoreId(pandascoreId);
        return {
          entityId: tournament.id,
          result: {
            success: true,
            tournamentId: tournament.id,
            pandascoreId,
            url: tournamentUrl(tournament),
          },
        };
      }),
  );
}
