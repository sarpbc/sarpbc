import { allocateSlug, eventSlug, toSlug } from "@sarpbc/utils";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { League } from "../domain/competition";
import { TournamentEvent, assertEventEditable, isEventSynced } from "../domain/tournament-event";
import { assertLeagueUpdateAllowed } from "../domain/tournament-source";
import { explicitEventSlug, requireEvent, requireLeague } from "./event-placement";
import type {
  CreateEventInput,
  CreateLeagueInput,
  UpdateEventInput,
  UpdateLeagueInput,
} from "./inputs";
import type { CompetitionAfterCommit } from "./after-commit";
import type {
  CompetitionTransaction,
  EventListing,
  EventQueries,
  TournamentQueries,
} from "./ports";

export class ManualCatalogService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly events: EventQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}
  leagues(): Promise<League[]> {
    return this.reads.leagues({ limit: 200 });
  }
  async createLeague(input: CreateLeagueInput): Promise<League> {
    const league = Object.assign(new League(), {
      name: input.name,
      slug: leagueSlug(input.slug ?? input.name),
      url: input.url?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
    });

    await this.transaction.run(({ tournaments }) => tournaments.saveLeague(league));

    return league;
  }
  async updateLeague(id: string, input: UpdateLeagueInput): Promise<League> {
    return this.transaction.run(async ({ tournaments }) => {
      const league = await requireLeague(tournaments, id);

      if (!league) throw new NotFoundError('League with id "' + id + '" was not found.');
      assertLeagueUpdateAllowed(league, input);

      if (input.name !== undefined) league.name = input.name;

      if (input.slug !== undefined)
        league.slug = input.slug === null ? null : leagueSlug(input.slug);

      if (input.url !== undefined) league.url = input.url?.trim() || null;

      if (input.imageUrl !== undefined) league.imageUrl = input.imageUrl?.trim() || null;
      await tournaments.saveLeague(league);

      return league;
    });
  }
  async manualEvents(): Promise<EventListing[]> {
    return (await this.events.unsynced()).filter(
      ({ event, stages }) => !isEventSynced(event, stages),
    );
  }
  async findEvent(idOrSlug: string): Promise<EventListing> {
    const found = await this.events.find(idOrSlug);

    if (!found) throw new NotFoundError('Event "' + idOrSlug + '" was not found.');

    return found;
  }
  async createEvent(input: CreateEventInput): Promise<EventListing> {
    const id = await this.transaction.run(async ({ tournaments, events }) => {
      const event = Object.assign(new TournamentEvent(), {
        name: input.name,
        league: await requireLeague(tournaments, input.leagueId),
      });

      event.slug = input.slug
        ? await explicitEventSlug(events, input.slug, event.id)
        : await allocateSlug(eventSlug(input.name, null), (slug) => events.slugTaken(slug, null));
      await events.save(event);

      return event.id;
    });

    return this.findEvent(id);
  }
  async updateEvent(id: string, input: UpdateEventInput): Promise<EventListing> {
    const stageIds = await this.transaction.run(async ({ tournaments, events }) => {
      const event = await requireEvent(events, id);
      const stages = await events.stages(event.id);
      assertEventEditable(event, stages);

      if (input.name !== undefined) event.name = input.name;

      if (input.leagueId !== undefined)
        event.league = await requireLeague(tournaments, input.leagueId);

      if (input.slug !== undefined) event.slug = await explicitEventSlug(events, input.slug, id);
      await events.save(event);

      return stages.map((stage) => stage.id);
    });

    await this.afterCommit.settle({ tournamentIds: stageIds });

    return this.findEvent(id);
  }
  async deleteEvent(id: string): Promise<void> {
    await this.transaction.run(async ({ events }) => {
      const event = await requireEvent(events, id);
      const stages = await events.stages(event.id);
      assertEventEditable(event, stages);

      if (stages.length > 0)
        throw new ConflictError(
          `${event.name} still has ${stages.length} ${stages.length === 1 ? "stage" : "stages"}; delete or move them first`,
        );
      await events.remove(event.id);
    });
  }
}

function leagueSlug(raw: string): string {
  const slug = toSlug(raw);

  if (!slug)
    throw new InvalidInputError(
      "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs).",
    );

  return slug;
}
