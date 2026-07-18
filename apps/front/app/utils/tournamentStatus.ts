import type { Tournament } from "~/types/tournament";

export type TournamentStatus = "live" | "upcoming" | "finished";

export function getTournamentStatus(
  tournament: Pick<Tournament, "beginAt" | "endAt">,
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
