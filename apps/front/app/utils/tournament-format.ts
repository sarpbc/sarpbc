import type { TournamentFormat } from "@sarpbc/types";

const PARTICIPANTS_COUNT_KEY = {
  "1v1": "page.tournaments.id.hero.playersCount",
  "2v2": "page.tournaments.id.hero.teamsCount",
  "3v3": "page.tournaments.id.hero.teamsCount",
} as const satisfies Record<TournamentFormat, string>;

export const participantsCountKey = (format: TournamentFormat): string =>
  PARTICIPANTS_COUNT_KEY[format];

export const nonDefaultFormatLabel = (format?: TournamentFormat | null): string | null =>
  !format || format === "3v3" ? null : format;
