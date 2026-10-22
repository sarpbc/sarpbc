export type TournamentStatus = "live" | "upcoming" | "finished";

export function getTournamentStatus(
  tournament: { beginAt?: Date | string | null; endAt?: Date | string | null },
  now = Date.now(),
): TournamentStatus | null {
  const beginAt = tournament.beginAt ? new Date(tournament.beginAt).getTime() : null;
  const endAt = tournament.endAt ? new Date(tournament.endAt).getTime() : null;

  if (beginAt === null) {
    return null;
  }

  if (endAt !== null && endAt < now) {
    return "finished";
  }

  if (beginAt <= now) {
    return "live";
  }

  return "upcoming";
}

export function tournamentStatusLabelKey(status: TournamentStatus): string {
  switch (status) {
    case "live":
      return "page.tournaments.id.status.live";
    case "upcoming":
      return "page.tournaments.id.status.upcoming";
    case "finished":
      return "page.tournaments.id.status.finished";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatTournamentShortDateRange(
  beginAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
  locale: string,
): string | null {
  const begin = beginAt ? new Date(beginAt) : null;
  if (!begin || Number.isNaN(begin.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const end = endAt ? new Date(endAt) : null;
  if (!end || Number.isNaN(end.getTime()) || end < begin) {
    return formatter.format(begin);
  }
  return formatter.formatRange(begin, end);
}

export function formatTournamentDateRange(
  beginAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
  locale: string,
): string | null {
  if (!beginAt && !endAt) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  if (beginAt && endAt) {
    const begin = new Date(beginAt);
    const end = new Date(endAt);
    if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return `${formatter.format(begin)} – ${formatter.format(end)}`;
  }

  const single = new Date((beginAt ?? endAt)!);
  if (Number.isNaN(single.getTime())) {
    return null;
  }
  return formatter.format(single);
}
