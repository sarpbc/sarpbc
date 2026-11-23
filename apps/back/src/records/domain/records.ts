import type { CalendarDay } from "@sarpbc/utils";

export interface RecordHolder {
  id: string;
  name: string;
}

export interface Candidate<T> {
  holder: T;
  name: string;
  value: number;
}

export interface Ranked<T> {
  rank: number;
  holder: T;
  value: number;
}

/** Best first, ties by name; equal values share the rank of the first of them (1, 2, 2, 4). */
export const rankTop = <T>(candidates: Candidate<T>[], order: "most" | "fewest", size: number) => {
  const sign = order === "most" ? -1 : 1;

  const sorted = candidates
    .toSorted((a, b) => sign * (a.value - b.value) || a.name.localeCompare(b.name, "en"))
    .slice(0, size);

  return sorted.map(({ holder, value }, index) => {
    const first = sorted.findIndex((entry) => entry.value === value);

    return { holder, rank: first === -1 ? index + 1 : first + 1, value } satisfies Ranked<T>;
  });
};

export const countTitles = <H extends RecordHolder>(titles: H[][]) => {
  const counts = new Map<string, Candidate<H>>();

  for (const holders of titles) {
    for (const holder of new Map(holders.map((entry) => [entry.id, entry])).values()) {
      const counted = counts.get(holder.id);
      counts.set(holder.id, {
        holder: counted?.holder ?? holder,
        name: holder.name,
        value: (counted?.value ?? 0) + 1,
      });
    }
  }

  return [...counts.values()];
};

export interface DecidedSeries {
  endAt: Date;
  order: number;
  winnerTeamId: string | null;
  loserTeamId: string | null;
}

export interface WinStreak {
  teamId: string;
  series: number;
  from: Date;
  to: Date;
}

const chronological = (a: DecidedSeries, b: DecidedSeries) =>
  a.endAt.getTime() - b.endAt.getTime() || a.order - b.order;

/** Each team's longest run of consecutive series wins; the first run reaching that length stands. */
export const longestWinStreaks = (series: DecidedSeries[]) => {
  const current = new Map<string, WinStreak>();
  const best = new Map<string, WinStreak>();

  for (const { endAt, winnerTeamId, loserTeamId } of series.toSorted(chronological)) {
    if (loserTeamId !== null) {
      current.delete(loserTeamId);
    }

    if (winnerTeamId === null) {
      continue;
    }

    const running = current.get(winnerTeamId);

    const streak = running
      ? { ...running, series: running.series + 1, to: endAt }
      : { from: endAt, series: 1, teamId: winnerTeamId, to: endAt };

    current.set(winnerTeamId, streak);

    if (streak.series > (best.get(winnerTeamId)?.series ?? 0)) {
      best.set(winnerTeamId, streak);
    }
  }

  return [...best.values()] satisfies WinStreak[];
};

const DAY_MS = 86_400_000;

const utc = ({ year, month, day }: CalendarDay) => Date.UTC(year, month - 1, day);

/** Whole years and the days since the last birthday; a February 29 birthday falls on March 1. */
export const ageOn = (birthday: CalendarDay, on: CalendarDay) => {
  const beforeBirthday =
    on.month < birthday.month || (on.month === birthday.month && on.day < birthday.day);

  const years = on.year - birthday.year - (beforeBirthday ? 1 : 0);
  const lastBirthday = utc({ ...birthday, year: birthday.year + years });

  return {
    days: Math.round((utc(on) - lastBirthday) / DAY_MS),
    totalDays: Math.round((utc(on) - utc(birthday)) / DAY_MS),
    years,
  };
};
