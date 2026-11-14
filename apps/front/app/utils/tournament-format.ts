import type { TournamentFormat } from "@sarpbc/types";

const PARTICIPANTS_COUNT_KEY = {
  "1v1": "page.tournaments.id.hero.playersCount",
  "2v2": "page.tournaments.id.hero.teamsCount",
  "3v3": "page.tournaments.id.hero.teamsCount",
} as const satisfies Record<TournamentFormat, string>;

export function participantsCountKey(format: TournamentFormat): string {
  return PARTICIPANTS_COUNT_KEY[format];
}

export function nonDefaultFormatLabel(format?: TournamentFormat | null): string | null {
  return !format || format === "3v3" ? null : format;
}
