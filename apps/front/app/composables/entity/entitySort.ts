export const PAST_ENTRIES_LIMIT = 10;

interface Timed {
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
}

function timeOf(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

export function byBeginAtAsc(a: Timed, b: Timed): number {
  return timeOf(a.beginAt) - timeOf(b.beginAt);
}

export function byEndAtDesc(a: Timed, b: Timed): number {
  return (timeOf(b.endAt) || timeOf(b.beginAt)) - (timeOf(a.endAt) || timeOf(a.beginAt));
}
