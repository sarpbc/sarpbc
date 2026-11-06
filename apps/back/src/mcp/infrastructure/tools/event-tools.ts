import { z } from "zod";
import type { ManualCatalogService } from "../../../tournament/application/manual-catalog.service";
import {
  createEventFields,
  createLeagueFields,
  updateEventFields,
  updateLeagueFields,
} from "../../../tournament/infrastructure/http/dto/manual-catalog.dto";
import { defineTool, type McpTool } from "../define-tool";
import { mapEvent, mapLeague } from "../mappers";
import type { RedistributableCompetition } from "../redistributable-competition";
import { DEFAULT_LIST_LIMIT, describeFields, listLimit } from "./tool-input";
import { requireUpdateFields } from "./update-fields";

export interface EventToolServices {
  catalogService: Pick<
    ManualCatalogService,
    "leagues" | "createLeague" | "updateLeague" | "createEvent" | "updateEvent"
  >;
  competition: Pick<RedistributableCompetition, "events" | "event">;
}

export function eventTools({ catalogService, competition }: EventToolServices): McpTool[] {
  return [
    defineTool({
      name: "list_leagues",
      description:
        "List leagues with id, name, slug and source. manual leagues were created by staff; pandascore leagues come from the sync. Use the id as leagueId on events and tournaments.",
      input: {},
      handler: async () => (await catalogService.leagues()).map(mapLeague),
    }),

    defineTool({
      name: "create_league",
      description:
        "Create a league for manual events and tournaments. Run list_leagues first to avoid duplicates.",
      write: true,
      permission: "tournaments.manage",
      input: describeFields(createLeagueFields, {
        name: "League name.",
        slug: "Optional slug. Generated from the name when omitted.",
        url: "Optional official website.",
        imageUrl: "Optional logo URL.",
      }),
      handler: async (input) => {
        const league = await catalogService.createLeague(input);
        return { entityId: league.id, result: mapLeague(league) };
      },
    }),

    defineTool({
      name: "update_league",
      description:
        "Update a league. Manual leagues accept every field; PandaScore leagues accept imageUrl only. Pass null to clear slug, url or imageUrl.",
      write: true,
      permission: "tournaments.manage",
      input: {
        leagueId: z.string().uuid().describe("League UUID from list_leagues."),
        ...describeFields(updateLeagueFields, {
          name: "League name.",
          slug: "Slug, or null to clear.",
          url: "Official website, or null to clear.",
          imageUrl: "Logo URL, or null to clear.",
        }),
      },
      handler: async ({ leagueId, ...input }) => {
        requireUpdateFields(input);
        const league = await catalogService.updateLeague(leagueId, input);
        return { entityId: league.id, result: mapLeague(league) };
      },
    }),

    defineTool({
      name: "list_events",
      description:
        "List events, newest first. An event groups tournament stages (phases) under one public page. Each event lists its stages earliest first with their dates and tier.",
      input: {
        activeOnly: z
          .boolean()
          .optional()
          .describe("When true, return only events with a stage that is not over."),
        limit: listLimit("events"),
        offset: z.number().int().min(0).optional().describe("Number of events to skip."),
      },
      handler: async ({ activeOnly, limit, offset }) => {
        const [listings, count] = await competition.events({
          activeOnly: activeOnly ?? false,
          limit: limit ?? DEFAULT_LIST_LIMIT,
          offset: offset ?? 0,
        });
        return { events: listings.map(mapEvent), count };
      },
    }),

    defineTool({
      name: "get_event",
      description:
        "Get an event by UUID or slug with its stages (tournament phases) earliest first, its league, its overall dates and its public URL. editable is false when the PandaScore sync manages the event. An event whose stages all moved elsewhere is returned with no stages so it can be reused.",
      input: {
        idOrSlug: z.string().min(1).describe("Event UUID or slug (first segment of its URL)."),
      },
      handler: async ({ idOrSlug }) => mapEvent(await competition.event(idOrSlug)),
    }),

    defineTool({
      name: "create_event",
      description:
        "Create an empty manual event, then attach tournaments to it with create_tournament or update_tournament eventId. The event page goes public once it has a stage. Run list_events first to avoid duplicates.",
      write: true,
      permission: "tournaments.manage",
      input: describeFields(createEventFields, {
        name: "Event name (e.g. Coupe de France 2026).",
        slug: "Optional URL slug. Generated from the name when omitted.",
        leagueId: "Optional league UUID from list_leagues.",
      }),
      handler: async (input) => {
        const listing = await catalogService.createEvent(input);
        return { entityId: listing.event.id, result: mapEvent(listing) };
      },
    }),

    defineTool({
      name: "update_event",
      description:
        "Rename a manual event, change its URL slug or its league. Events managed by the PandaScore sync are rejected. Stages keep their own names; move a stage with update_tournament eventId. Changing the slug changes every stage URL.",
      write: true,
      permission: "tournaments.manage",
      input: {
        eventId: z.string().uuid().describe("Event UUID from get_event or list_events."),
        ...describeFields(updateEventFields, {
          name: "Event name.",
          slug: "Event URL slug.",
          leagueId: "League UUID, or null to clear.",
        }),
      },
      handler: async ({ eventId, ...input }) => {
        requireUpdateFields(input);
        const listing = await catalogService.updateEvent(eventId, input);
        return { entityId: listing.event.id, result: mapEvent(listing) };
      },
    }),
  ];
}
