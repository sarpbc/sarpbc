type Instant = Date | string | number;

export interface MatchLifecycle {
  status?: string | null;
  beginAt?: Instant | null;
  endAt?: Instant | null;
}

export interface MatchResultScore {
  participantId: string;
  score: number;
}

const toMillis = (value: Instant): number => new Date(value).getTime();

export function isMatchFinished(match: MatchLifecycle): boolean {
  return Boolean(match.endAt) || match.status === "finished";
}

export function isMatchLive(match: MatchLifecycle, now: Instant): boolean {
  const { beginAt } = match;

  return (
    !isMatchFinished(match) &&
    beginAt !== null &&
    beginAt !== undefined &&
    beginAt !== "" &&
    beginAt !== 0 &&
    toMillis(beginAt) <= toMillis(now)
  );
}

/** The participant with the single highest score, or null when fewer than two scored or the top is tied. */
export function winnerFromResults(results: readonly MatchResultScore[]): string | null {
  const scored = results.filter((result) => result.participantId);

  if (scored.length < 2) {
    return null;
  }

  const top = Math.max(...scored.map((result) => result.score));
  const leaders = scored.filter((result) => result.score === top);

  const leader: (typeof leaders)[number] | undefined = leaders[0];

  return leaders.length === 1 && leader !== undefined ? leader.participantId : null;
}
