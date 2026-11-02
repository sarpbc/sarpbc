import { v4 } from "uuid";
import type { TournamentEventRef } from "@sarpbc/types";
import type { DataSource } from "../../common/domain/data-source";
import { InvalidInputError } from "../../common/domain/errors";
import type { League } from "./competition";

export class TournamentEvent {
  id = v4();
  pandascoreSerieId: number | null = null;
  slug = "";
  name = "";
  league: League | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}

/** The sync renames an event that follows a serie or holds a PandaScore stage. */
export function isEventSynced(
  event: TournamentEvent,
  stages: ReadonlyArray<{ source: DataSource }>,
): boolean {
  return event.pandascoreSerieId !== null || stages.some((stage) => stage.source === "pandascore");
}

export function assertEventEditable(
  event: TournamentEvent,
  stages: ReadonlyArray<{ source: DataSource }>,
): void {
  if (isEventSynced(event, stages))
    throw new InvalidInputError(
      "This event is managed by the PandaScore sync. Only manual events can be edited.",
    );
}

/**
 * A manual tournament created without an event gets an event of its own, named after it. Only that
 * event follows the tournament's name, slug and league; a shared or separately named event does not.
 */
export function ownsEvent(
  event: TournamentEvent,
  stageIds: readonly string[],
  tournament: { id: string; name: string },
): boolean {
  return stageIds.length === 1 && stageIds[0] === tournament.id && event.name === tournament.name;
}

export function toEventRef(event: TournamentEvent): TournamentEventRef {
  return { id: event.id, slug: event.slug, name: event.name };
}

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

function isGenericStageName(name: string): boolean {
  return GENERIC_STAGE_NAMES.has(name.toLowerCase());
}

export function eventDisplayName(input: {
  leagueName: string | null;
  serieName: string | null;
  stageName: string;
}): string {
  const league = input.leagueName?.trim();
  const serie = input.serieName?.trim();
  const stage = input.stageName.trim();
  if (serie) {
    if (/^\d{4}$/.test(serie)) {
      if (league) return `${league} ${serie}`;
      return stage && !isGenericStageName(stage) ? stage : serie;
    }
    return league && !serie.toLowerCase().startsWith(league.toLowerCase())
      ? `${league} ${serie}`
      : serie;
  }
  if (league && stage) return `${league} ${stage}`;
  return stage || league || "";
}

function utcDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** Same-day stages start at staggered times (Group B before Group A), so order by day, then name. */
export function compareStages(
  a: { beginAt: Date | null; name: string },
  b: { beginAt: Date | null; name: string },
): number {
  return utcDay(b.beginAt).localeCompare(utcDay(a.beginAt)) || a.name.localeCompare(b.name);
}
