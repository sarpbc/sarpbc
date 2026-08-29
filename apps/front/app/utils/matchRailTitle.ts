import { daysFromToday, parseMatchDate } from "./calendarDay";

export type MatchRailTitleKind = "today" | "tomorrow" | "upcoming";

type MatchWithBeginAt = {
  beginAt?: Date | string | null;
};

export function resolveMatchRailTitleKind(
  live: MatchWithBeginAt[],
  upcoming: MatchWithBeginAt[],
  now: Date = new Date(),
): MatchRailTitleKind {
  if (live.length > 0) {
    return "today";
  }

  let earliestOffset: number | null = null;

  for (const match of upcoming) {
    const beginAt = parseMatchDate(match.beginAt);
    if (!beginAt) {
      continue;
    }

    const offset = daysFromToday(beginAt, now);
    if (earliestOffset === null || offset < earliestOffset) {
      earliestOffset = offset;
    }
  }

  if (earliestOffset === null) {
    return "upcoming";
  }

  if (earliestOffset <= 0) {
    return "today";
  }

  if (earliestOffset === 1) {
    return "tomorrow";
  }

  return "upcoming";
}
