import { allocateSlug, stageSlug, toSlug } from "@sarpbc/utils";
import { ConflictError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { isUuid } from "../../common/domain/entity-ref";
import type { Tournament } from "../domain/competition";
import { toEventRef, type TournamentEvent } from "../domain/tournament-event";
import type { EventWriter, TournamentWriter } from "./ports";

export async function requireLeague(writer: TournamentWriter, id: string | null | undefined) {
  if (id === null || id === undefined || id === "") return null;
  const league = await writer.league(id);

  if (!league)
    throw new NotFoundError(
      'League with id "' + id + '" was not found. Choose a league from the list.',
    );

  return league;
}

export async function requireEvent(events: EventWriter, id: string): Promise<TournamentEvent> {
  const event = await events.load(id);

  if (!event)
    throw new NotFoundError('Event with id "' + id + '" was not found. Choose an existing event.');

  return event;
}

export async function explicitEventSlug(events: EventWriter, raw: string, eventId: string) {
  const slug = toSlug(raw);

  if (!slug || isUuid(slug))
    throw new InvalidInputError(
      "Enter a valid slug using letters, numbers, and hyphens (e.g. rlcs-2026).",
    );

  if (await events.slugTaken(slug, eventId))
    throw new ConflictError(
      `An event with the slug "${slug}" already exists. Choose a different slug.`,
    );

  return slug;
}

export async function placeStage(
  events: EventWriter,
  tournament: Tournament,
  event: TournamentEvent,
) {
  tournament.slug = await allocateSlug(
    stageSlug(tournament.name),
    async (slug) => await events.stageSlugTaken(event.id, slug, tournament.id),
  );
  tournament.event = toEventRef(event);
}
