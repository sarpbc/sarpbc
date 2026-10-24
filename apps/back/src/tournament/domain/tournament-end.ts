const SETTLED_STATUSES = new Set(["finished", "canceled"]);

export interface MatchTiming {
  status: string | null;
  beginAt: Date | null;
  endAt: Date | null;
}

/** PandaScore leaves some stages without an end date and some matches without an end time. */
export function inferEndAt(matches: readonly MatchTiming[]): Date | null {
  if (!matches.some((match) => match.status === "finished")) return null;
  let latest: Date | null = null;
  for (const match of matches) {
    if (!SETTLED_STATUSES.has(match.status ?? "")) return null;
    if (match.status !== "finished") continue;
    const time = match.endAt ?? match.beginAt;
    if (time && (!latest || time > latest)) latest = time;
  }
  return latest;
}
