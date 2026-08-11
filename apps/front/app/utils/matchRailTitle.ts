import { daysFromToday, parseMatchDate } from "./calendarDay";

export type MatchRailTitleKind = "today" | "tomorrow" | "upcoming";

type MatchWithBeginAt = {
  beginAt?: Date | string | null;
};

/**
 * Resolve the lateral/home match rail caption from live + upcoming matches.
 * - Live matches or any match today → today
 * - Otherwise earliest known scheduled day is tomorrow → tomorrow
 * - Else (later days / unknown dates) → upcoming
 */
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
