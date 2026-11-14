import { allocateSlug, eventSlug, toSlug } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import type { Tournament } from "../domain/tournament";
import { TournamentEvent, ownsEvent, toEventRef } from "../domain/tournament-event";
import { explicitEventSlug, placeStage, requireEvent } from "./event-placement";
import type { UpdateTournamentInput } from "./inputs";
import type { EventWriter } from "./ports";

export function sharedEventSlugError(): InvalidInputError {
  return new InvalidInputError(
    "This tournament is a stage of a shared event, so it has no slug of its own. Change the slug on the event instead.",
  );
}

export async function createOwnEvent(
  events: EventWriter,
  tournament: Tournament,
  slug: string | undefined,
): Promise<TournamentEvent> {
  const event = Object.assign(new TournamentEvent(), {
    name: tournament.name,
    league: tournament.league,
  });

  event.slug =
    slug !== undefined && slug !== ""
      ? await explicitEventSlug(events, slug, event.id)
      : await allocateSlug(
          eventSlug(tournament.name, null),
          async (taken) => await events.slugTaken(taken, null),
        );
  await events.save(event);

  return event;
}

export async function updateEvent(
  events: EventWriter,
  tournament: Tournament,
  previousName: string,
  input: UpdateTournamentInput,
): Promise<void> {
  if (input.eventId !== undefined && input.eventId !== tournament.event.id) {
    if (input.slug !== undefined) throw sharedEventSlugError();
    await placeStage(events, tournament, await requireEvent(events, input.eventId));

    return;
  }

  const event = await requireEvent(events, tournament.event.id);
  const stages = await events.stages(event.id);
  const stageIds = stages.map((stage) => stage.id);

  if (!ownsEvent(event, stageIds, { id: tournament.id, name: previousName })) {
    if (input.slug !== undefined && toSlug(input.slug) !== event.slug) throw sharedEventSlugError();

    return;
  }

  event.name = tournament.name;
  event.league = tournament.league;

  if (input.slug !== undefined) event.slug = await explicitEventSlug(events, input.slug, event.id);
  await events.save(event);
  tournament.event = toEventRef(event);
}
