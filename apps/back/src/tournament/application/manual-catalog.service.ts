import { allocateSlug, eventSlug, toSlug } from "@sarpbc/utils";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { League } from "../domain/league";
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
import { nonBlank } from "../../common/domain/text";
import type {
  CompetitionTransaction,
  EventListing,
  EventQueries,
  TournamentQueries,
} from "./ports";

const leagueSlug = (raw: string): string => {
  const slug = toSlug(raw);

  if (!slug) {
    throw new InvalidInputError(
      "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs).",
    );
  }

  return slug;
};

export class ManualCatalogService {
  constructor(
    private readonly reads: TournamentQueries,
    private readonly events: EventQueries,
    private readonly transaction: CompetitionTransaction,
    private readonly afterCommit: CompetitionAfterCommit,
  ) {}
  async leagues(): Promise<League[]> {
    return await this.reads.leagues({ limit: 200 });
  }
  async createLeague(input: CreateLeagueInput): Promise<League> {
    const league = Object.assign(new League(), {
      name: input.name,
      slug: leagueSlug(input.slug ?? input.name),
      url: nonBlank(input.url) ?? null,
      imageUrl: nonBlank(input.imageUrl) ?? null,
    });

    await this.transaction.run(async ({ tournaments }) => {
      await tournaments.saveLeague(league);
    });

    return league;
  }
  async updateLeague(id: string, input: UpdateLeagueInput): Promise<League> {
    return await this.transaction.run(async ({ tournaments }) => {
      const league = await requireLeague(tournaments, id);

      if (!league) {
        throw new NotFoundError(`League with id "${id}" was not found.`);
      }

      assertLeagueUpdateAllowed(league, input);

      if (input.name !== undefined) {
        league.name = input.name;
      }

      if (input.slug !== undefined) {
        league.slug = input.slug === null ? null : leagueSlug(input.slug);
      }

      if (input.url !== undefined) {
        league.url = nonBlank(input.url) ?? null;
      }

      if (input.imageUrl !== undefined) {
        league.imageUrl = nonBlank(input.imageUrl) ?? null;
      }

      await tournaments.saveLeague(league);

      return league;
    });
  }
  async manualEvents(): Promise<EventListing[]> {
    const unsynced = await this.events.unsynced();

    return unsynced.filter(({ event, stages }) => !isEventSynced(event, stages));
  }
  async findEvent(idOrSlug: string): Promise<EventListing> {
    const found = await this.events.find(idOrSlug);

    if (!found) {
      throw new NotFoundError(`Event "${idOrSlug}" was not found.`);
    }

    return found;
  }
  async createEvent(input: CreateEventInput): Promise<EventListing> {
    const id = await this.transaction.run(async ({ tournaments, events }) => {
      const event = Object.assign(new TournamentEvent(), {
        name: input.name,
        league: await requireLeague(tournaments, input.leagueId),
      });

      event.slug =
        input.slug !== undefined && input.slug !== ""
          ? await explicitEventSlug(events, input.slug, event.id)
          : await allocateSlug(
              eventSlug(input.name, null),
              async (slug) => await events.slugTaken(slug, null),
            );
      await events.save(event);

      return event.id;
    });

    return await this.findEvent(id);
  }
  async updateEvent(id: string, input: UpdateEventInput): Promise<EventListing> {
    const stageIds = await this.transaction.run(async ({ tournaments, events }) => {
      const event = await requireEvent(events, id);
      const stages = await events.stages(event.id);
      assertEventEditable(event, stages);

      if (input.name !== undefined) {
        event.name = input.name;
      }

      if (input.leagueId !== undefined) {
        event.league = await requireLeague(tournaments, input.leagueId);
      }

      if (input.slug !== undefined) {
        event.slug = await explicitEventSlug(events, input.slug, id);
      }

      await events.save(event);

      return stages.map((stage) => stage.id);
    });

    await this.afterCommit.settle({ tournamentIds: stageIds });

    return await this.findEvent(id);
  }
  async deleteEvent(id: string): Promise<void> {
    await this.transaction.run(async ({ events }) => {
      const event = await requireEvent(events, id);
      const stages = await events.stages(event.id);
      assertEventEditable(event, stages);

      if (stages.length > 0) {
        throw new ConflictError(
          `${event.name} still has ${stages.length} ${stages.length === 1 ? "stage" : "stages"}; delete or move them first`,
        );
      }

      await events.remove(event.id);
    });
  }
}
