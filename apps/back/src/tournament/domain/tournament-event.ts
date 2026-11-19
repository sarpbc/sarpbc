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

export const isEventSynced = (event: TournamentEvent, stages: readonly { source: DataSource }[]) =>
  event.pandascoreSerieId !== null || stages.some((stage) => stage.source === "pandascore");

export const assertEventEditable = (
  event: TournamentEvent,
  stages: readonly { source: DataSource }[],
) => {
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
) => stageIds.length === 1 && stageIds[0] === tournament.id && event.name === tournament.name;

export const toEventRef = (event: TournamentEventRef) =>
  ({
    id: event.id,
    name: event.name,
    slug: event.slug,
  }) satisfies TournamentEventRef;

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

const isGenericStageName = (name: string) => GENERIC_STAGE_NAMES.has(name.toLowerCase());

const prefixLeague = (league: string, serie: string) => {
  if (serie.toLowerCase().startsWith(league.toLowerCase())) {
    return serie;
  }

  const leagueWords = league.split(/\s+/u);
  const serieWords = serie.split(/\s+/u);

  for (let overlap = Math.min(leagueWords.length, serieWords.length); overlap > 0; overlap -= 1) {
    const tail = leagueWords.slice(-overlap).join(" ").toLowerCase();
    const head = serieWords.slice(0, overlap).join(" ").toLowerCase();

    if (tail === head) {
      return [league, ...serieWords.slice(overlap)].join(" ");
    }
  }

  return `${league} ${serie}`;
};

export const eventDisplayName = (input: {
  leagueName: string | null;
  serieName: string | null;
  stageName: string;
}) => {
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

    return league === undefined ? serie : prefixLeague(league, serie);
  }

  if (league !== undefined && stage) {
    return `${league} ${stage}`;
  }

  return stage || (league ?? "");
};

const utcDay = (date: Date | null) => (date ? isoDay(date) : "");

/** Same-day stages start at staggered times (Group B before Group A), so order by day, then name. */
export const compareStages = (
  a: { beginAt: Date | null; name: string },
  b: { beginAt: Date | null; name: string },
) => utcDay(b.beginAt).localeCompare(utcDay(a.beginAt)) || a.name.localeCompare(b.name);
