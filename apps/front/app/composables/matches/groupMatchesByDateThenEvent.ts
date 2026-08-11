import type { MatchListItem } from "~/types/matches";
import { localDayKey, parseMatchDate } from "~/utils/calendarDay";
import { groupMatchesByEvent, type MatchEventGroup } from "./groupMatchesByEvent";

export type MatchDateEventGroup = {
  dateKey: string;
  date: Date | null;
  events: MatchEventGroup[];
};

/**
 * Group upcoming list matches by local calendar day, then by tournament event.
 * Days without a beginAt go last under dateKey "__unknown__".
 */
export function groupMatchesByDateThenEvent(
  matches: MatchListItem[],
  unknownLabel: string,
): MatchDateEventGroup[] {
  const unknown: MatchListItem[] = [];
  const byDay = new Map<string, { date: Date; matches: MatchListItem[] }>();

  for (const match of matches) {
    const date = parseMatchDate(match.beginAt);
    if (!date) {
      unknown.push(match);
      continue;
    }

    const dateKey = localDayKey(date);
    const existing = byDay.get(dateKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      byDay.set(dateKey, { date, matches: [match] });
    }
  }

  const groups: MatchDateEventGroup[] = [...byDay.values()]
    .map((group) => ({
      dateKey: localDayKey(group.date),
      date: group.date,
      events: groupMatchesByEvent(
        group.matches.sort((a, b) => {
          const aTime = parseMatchDate(a.beginAt)?.getTime() ?? 0;
          const bTime = parseMatchDate(b.beginAt)?.getTime() ?? 0;
          return aTime - bTime;
        }),
        unknownLabel,
      ),
    }))
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  if (unknown.length > 0) {
    groups.push({
      dateKey: "__unknown__",
      date: null,
      events: groupMatchesByEvent(unknown, unknownLabel),
    });
  }

  return groups;
}
