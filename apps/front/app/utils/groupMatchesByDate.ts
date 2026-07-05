import type { Match } from "~/types/matches";

export type MatchDateGroup = {
  dateKey: string;
  date: Date | null;
  matches: Match[];
};

export type TournamentMatchesByDate = {
  upcoming: MatchDateGroup[];
  completed: MatchDateGroup[];
};

function parseDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getGroupDate(match: Match, played: boolean): Date | null {
  return played ? parseDate(match.endAt) : parseDate(match.beginAt);
}

function groupByDate(
  matches: Match[],
  played: boolean,
  groupOrder: "asc" | "desc",
): MatchDateGroup[] {
  const unknown: Match[] = [];
  const byDay = new Map<string, { date: Date; matches: Match[] }>();

  for (const match of matches) {
    const date = getGroupDate(match, played);
    if (!date) {
      unknown.push(match);
      continue;
    }

    const dateKey = date.toDateString();
    const existing = byDay.get(dateKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      byDay.set(dateKey, { date, matches: [match] });
    }
  }

  const sortMatches = (a: Match, b: Match) => {
    const aTime = getGroupDate(a, played)?.getTime() ?? 0;
    const bTime = getGroupDate(b, played)?.getTime() ?? 0;
    return groupOrder === "desc" ? bTime - aTime : aTime - bTime;
  };

  const groups: MatchDateGroup[] = [...byDay.values()]
    .map((group) => ({
      dateKey: group.date.toDateString(),
      date: group.date,
      matches: group.matches.sort(sortMatches),
    }))
    .sort((a, b) => {
      const aTime = a.date!.getTime();
      const bTime = b.date!.getTime();
      return groupOrder === "desc" ? bTime - aTime : aTime - bTime;
    });

  if (unknown.length > 0) {
    groups.push({
      dateKey: "__unknown__",
      date: null,
      matches: unknown,
    });
  }

  return groups;
}

export function groupTournamentMatchesByDate(matches: Match[]): TournamentMatchesByDate {
  const upcoming = matches.filter((match) => !match.endAt);
  const completed = matches.filter((match) => match.endAt);

  return {
    upcoming: groupByDate(upcoming, false, "asc"),
    completed: groupByDate(completed, true, "desc"),
  };
}
