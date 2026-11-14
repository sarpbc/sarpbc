import { v4 } from "uuid";
import type { TournamentEventRef, DataSource, Stream, Viewership } from "@sarpbc/types";
import { isoDay } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { nonBlank } from "../../common/domain/text";
import type { League } from "./league";

export class TournamentEvent {
  id = v4();
  pandascoreSerieId: number | null = null;
  slug = "";
  name = "";
  league: League | null = null;
  streams: Stream[] = [];
  viewership: Viewership | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

export const isEventSynced = (
  event: TournamentEvent,
  stages: readonly { source: DataSource }[],
): boolean =>
  event.pandascoreSerieId !== null || stages.some((stage) => stage.source === "pandascore");

export const assertEventEditable = (
  event: TournamentEvent,
  stages: readonly { source: DataSource }[],
): void => {
  if (isEventSynced(event, stages)) {
    throw new InvalidInputError(
      "This event is managed by the PandaScore sync. Only manual events can be edited.",
    );
  }
};

/**
 * A manual tournament created without an event gets an event of its own, named after it. Only that
 * event follows the tournament's name, slug and league; a shared or separately named event does not.
 */
export const ownsEvent = (
  event: TournamentEvent,
  stageIds: readonly string[],
  tournament: { id: string; name: string },
): boolean =>
  stageIds.length === 1 && stageIds[0] === tournament.id && event.name === tournament.name;

export const toEventRef = (event: TournamentEventRef): TournamentEventRef => ({
  id: event.id,
  slug: event.slug,
  name: event.name,
});

const GENERIC_STAGE_NAMES = new Set([
  "playoffs",
  "group stage",
  "group a",
  "group b",
  "group c",
  "group d",
  "swiss",
  "main event",
  "grand finals",
  "finals",
]);

const isGenericStageName = (name: string): boolean => GENERIC_STAGE_NAMES.has(name.toLowerCase());

export const eventDisplayName = (input: {
  leagueName: string | null;
  serieName: string | null;
  stageName: string;
}): string => {
  const league = nonBlank(input.leagueName);
  const serie = nonBlank(input.serieName);
  const stage = input.stageName.trim();

  if (serie !== undefined) {
    if (/^\d{4}$/u.test(serie)) {
      if (league !== undefined) {
        return `${league} ${serie}`;
      }

      return stage && !isGenericStageName(stage) ? stage : serie;
    }

    return league !== undefined && !serie.toLowerCase().startsWith(league.toLowerCase())
      ? `${league} ${serie}`
      : serie;
  }

  if (league !== undefined && stage) {
    return `${league} ${stage}`;
  }

  return stage || (league ?? "");
};

const utcDay = (date: Date | null): string => (date ? isoDay(date) : "");

/** Same-day stages start at staggered times (Group B before Group A), so order by day, then name. */
export const compareStages = (
  a: { beginAt: Date | null; name: string },
  b: { beginAt: Date | null; name: string },
): number => utcDay(b.beginAt).localeCompare(utcDay(a.beginAt)) || a.name.localeCompare(b.name);
