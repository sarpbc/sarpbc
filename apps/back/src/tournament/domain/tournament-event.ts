import { v4 } from "uuid";
import type { TournamentEventRef } from "@sarpbc/types";
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
