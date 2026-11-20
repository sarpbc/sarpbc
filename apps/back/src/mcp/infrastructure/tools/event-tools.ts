import { DEFAULT_PAGE_SIZE } from "@sarpbc/utils";
import { z } from "zod";
import type { ManualCatalogService } from "../../../tournament/application/manual-catalog.service";
import {
  createEventFields,
  createLeagueFields,
  updateEventFields,
  updateLeagueFields,
} from "../../../tournament/infrastructure/http/dto/manual-catalog.dto";
import { defineTool } from "../define-tool";
import { mapEvent, mapLeague } from "../mappers";
import type { CompetitionReads } from "../competition-reads";
import { describeFields, listLimit } from "./tool-input";
import { requireUpdateFields } from "./update-fields";

export interface EventToolServices {
  catalogService: Pick<
    ManualCatalogService,
    "leagues" | "createLeague" | "updateLeague" | "createEvent" | "updateEvent"
  >;
  competition: Pick<CompetitionReads, "events" | "event">;
}

export const eventTools = ({ catalogService, competition }: EventToolServices) => [
  defineTool({
    description:
      "List leagues with id, name, slug and source. manual leagues were created by staff; pandascore leagues come from the sync. Use the id as leagueId on events and tournaments.",
    handler: async () => {
      const leagues = await catalogService.leagues();

      return leagues.map(mapLeague);
    },
    input: {},
    name: "list_leagues",
  }),

  defineTool({
    description:
      "Create a league for manual events and tournaments. Run list_leagues first to avoid duplicates.",
    handler: async (input) => {
      const league = await catalogService.createLeague(input);

      return { entityId: league.id, result: mapLeague(league) };
    },
    input: describeFields(createLeagueFields, {
      imageUrl: "Optional logo URL.",
      name: "League name.",
      slug: "Optional slug. Generated from the name when omitted.",
      url: "Optional official website.",
    }),
    name: "create_league",
    permission: "tournaments.manage",
    write: true,
  }),

  defineTool({
    description:
      "Update a league. Manual leagues accept every field; PandaScore leagues accept imageUrl only. Pass null to clear slug, url or imageUrl.",
    handler: async ({ leagueId, ...input }) => {
      requireUpdateFields(input);
      const league = await catalogService.updateLeague(leagueId, input);

      return { entityId: league.id, result: mapLeague(league) };
    },
    input: {
      leagueId: z.uuid().describe("League UUID from list_leagues."),
      ...describeFields(updateLeagueFields, {
        imageUrl: "Logo URL, or null to clear.",
        name: "League name.",
        slug: "Slug, or null to clear.",
        url: "Official website, or null to clear.",
      }),
    },
    name: "update_league",
    permission: "tournaments.manage",
    write: true,
  }),

  defineTool({
    description:
      "List events, newest first. An event groups tournament stages (phases) under one public page. Each event lists its stages earliest first with their dates and tier.",
    handler: async ({ activeOnly, limit, offset }) => {
      const [listings, count] = await competition.events({
        activeOnly: activeOnly ?? false,
        limit: limit ?? DEFAULT_PAGE_SIZE,
        offset: offset ?? 0,
      });

      return { count, events: listings.map(mapEvent) };
    },
    input: {
      activeOnly: z
        .boolean()
        .optional()
        .describe("When true, return only events with a stage that is not over."),
      limit: listLimit("events"),
      offset: z.number().int().min(0).optional().describe("Number of events to skip."),
    },
    name: "list_events",
  }),

  defineTool({
    description:
      "Get an event by UUID or slug with its stages (tournament phases) earliest first, its league, its overall dates and its public URL. editable is false when the PandaScore sync manages the event. An event whose stages all moved elsewhere is returned with no stages so it can be reused.",
    handler: async ({ idOrSlug }) => mapEvent(await competition.event(idOrSlug)),
    input: {
      idOrSlug: z.string().min(1).describe("Event UUID or slug (first segment of its URL)."),
    },
    name: "get_event",
  }),

  defineTool({
    description:
      "Create an empty manual event, then attach tournaments to it with create_tournament or update_tournament eventId. The event page goes public once it has a stage. Run list_events first to avoid duplicates.",
    handler: async (input) => {
      const listing = await catalogService.createEvent(input);

      return { entityId: listing.event.id, result: mapEvent(listing) };
    },
    input: describeFields(createEventFields, {
      leagueId: "Optional league UUID from list_leagues.",
      name: "Event name (e.g. Coupe de France 2026).",
      slug: "Optional URL slug. Generated from the name when omitted.",
    }),
    name: "create_event",
    permission: "tournaments.manage",
    write: true,
  }),

  defineTool({
    description:
      "Rename a manual event, change its URL slug or its league. Events managed by the PandaScore sync are rejected. Stages keep their own names; move a stage with update_tournament eventId. Changing the slug changes every stage URL.",
    handler: async ({ eventId, ...input }) => {
      requireUpdateFields(input);
      const listing = await catalogService.updateEvent(eventId, input);

      return { entityId: listing.event.id, result: mapEvent(listing) };
    },
    input: {
      eventId: z.uuid().describe("Event UUID from get_event or list_events."),
      ...describeFields(updateEventFields, {
        leagueId: "League UUID, or null to clear.",
        name: "Event name.",
        slug: "Event URL slug.",
      }),
    },
    name: "update_event",
    permission: "tournaments.manage",
    write: true,
  }),
];
