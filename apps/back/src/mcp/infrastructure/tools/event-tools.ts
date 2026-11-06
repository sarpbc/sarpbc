import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NotFoundException } from "@nestjs/common";
import { isRedistributable } from "../../../common/domain/data-source";
import { mapEvent, mapLeague } from "../mappers";
import type { McpToolContext } from "../mcp-tool-context";
import { runReadTool, runWriteTool } from "../permission-gate";
import { requireUpdateFields } from "./update-fields";

const slugSchema = z.string().trim().min(1).max(255);
const urlSchema = z.string().url().max(255);

export function registerEventTools(server: McpServer, ctx: McpToolContext): void {
  const { user } = ctx;

  server.registerTool(
    "list_leagues",
    {
      description:
        "List leagues with id, name, slug and source. manual leagues were created by staff; pandascore leagues come from the sync. Use the id as leagueId on events and tournaments.",
      inputSchema: {},
    },
    async () => runReadTool(async () => (await ctx.catalogService.leagues()).map(mapLeague)),
  );

  server.registerTool(
    "create_league",
    {
      description:
        "Create a league for manual events and tournaments. Requires tournaments.manage. Run list_leagues first to avoid duplicates.",
      inputSchema: {
        name: z.string().trim().min(1).max(255).describe("League name."),
        slug: slugSchema
          .optional()
          .describe("Optional slug. Generated from the name when omitted."),
        url: urlSchema.optional().describe("Optional official website."),
        imageUrl: urlSchema.optional().describe("Optional logo URL."),
      },
    },
    async (input) =>
      runWriteTool(user, "create_league", "tournaments.manage", async () => {
        const league = await ctx.catalogService.createLeague(input);
        return { entityId: league.id, result: mapLeague(league) };
      }),
  );

  server.registerTool(
    "update_league",
    {
      description:
        "Update a league. Requires tournaments.manage. Manual leagues accept every field; PandaScore leagues accept imageUrl only. Pass null to clear slug, url or imageUrl.",
      inputSchema: {
        leagueId: z.string().uuid().describe("League UUID from list_leagues."),
        name: z.string().trim().min(1).max(255).optional().describe("League name."),
        slug: slugSchema.nullable().optional().describe("Slug, or null to clear."),
        url: urlSchema.nullable().optional().describe("Official website, or null to clear."),
        imageUrl: urlSchema.nullable().optional().describe("Logo URL, or null to clear."),
      },
    },
    async ({ leagueId, ...input }) =>
      runWriteTool(user, "update_league", "tournaments.manage", async () => {
        requireUpdateFields(input);
        const league = await ctx.catalogService.updateLeague(leagueId, input);
        return { entityId: league.id, result: mapLeague(league) };
      }),
  );

  server.registerTool(
    "list_events",
    {
      description:
        "List events, newest first. An event groups tournament stages (phases) under one public page. Each event lists its stages earliest first with their dates and tier.",
      inputSchema: {
        activeOnly: z
          .boolean()
          .optional()
          .describe("When true, return only events with a stage that is not over."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of events to return (default 20)."),
        offset: z.number().int().min(0).optional().describe("Number of events to skip."),
      },
    },
    async ({ activeOnly, limit, offset }) =>
      runReadTool(async () => {
        const [listings, count] = await ctx.events.list({
          activeOnly: activeOnly ?? false,
          redistributableOnly: true,
          limit: limit ?? 20,
          offset: offset ?? 0,
        });
        return { events: listings.map(mapEvent), count };
      }),
  );

  server.registerTool(
    "get_event",
    {
      description:
        "Get an event by UUID or slug with its stages (tournament phases) earliest first, its league, its overall dates and its public URL. editable is false when the PandaScore sync manages the event. An event whose stages all moved elsewhere is returned with no stages so it can be reused.",
      inputSchema: {
        idOrSlug: z.string().min(1).describe("Event UUID or slug (first segment of its URL)."),
      },
    },
    async ({ idOrSlug }) =>
      runReadTool(async () => {
        const listing = await ctx.catalogService.findEvent(idOrSlug);
        if (
          listing.stages.length &&
          !listing.stages.some((stage) => isRedistributable(stage.source))
        )
          throw new NotFoundException(`Event "${idOrSlug}" was not found.`);
        return mapEvent(listing);
      }),
  );

  server.registerTool(
    "create_event",
    {
      description:
        "Create an empty manual event, then attach tournaments to it with create_tournament or update_tournament eventId. Requires tournaments.manage. The event page goes public once it has a stage. Run list_events first to avoid duplicates.",
      inputSchema: {
        name: z.string().trim().min(1).max(255).describe("Event name (e.g. Coupe de France 2026)."),
        slug: slugSchema
          .optional()
          .describe("Optional URL slug. Generated from the name when omitted."),
        leagueId: z.string().uuid().optional().describe("Optional league UUID from list_leagues."),
      },
    },
    async (input) =>
      runWriteTool(user, "create_event", "tournaments.manage", async () => {
        const listing = await ctx.catalogService.createEvent(input);
        return { entityId: listing.event.id, result: mapEvent(listing) };
      }),
  );

  server.registerTool(
    "update_event",
    {
      description:
        "Rename a manual event, change its URL slug or its league. Requires tournaments.manage. Events managed by the PandaScore sync are rejected. Stages keep their own names; move a stage with update_tournament eventId. Changing the slug changes every stage URL.",
      inputSchema: {
        eventId: z.string().uuid().describe("Event UUID from get_event or list_events."),
        name: z.string().trim().min(1).max(255).optional().describe("Event name."),
        slug: slugSchema.optional().describe("Event URL slug."),
        leagueId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe("League UUID, or null to clear."),
      },
    },
    async ({ eventId, ...input }) =>
      runWriteTool(user, "update_event", "tournaments.manage", async () => {
        requireUpdateFields(input);
        const listing = await ctx.catalogService.updateEvent(eventId, input);
        return { entityId: listing.event.id, result: mapEvent(listing) };
      }),
  );
}
