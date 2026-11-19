import { isNonEmptyDateInput } from "@sarpbc/utils";

export const PAST_ENTRIES_LIMIT = 10;

interface Timed {
  beginAt?: Date | string | null;
  endAt?: Date | string | null;
}

const timeOf = (value: Date | string | null | undefined) =>
  isNonEmptyDateInput(value) ? new Date(value).getTime() : 0;

export const byBeginAtAsc = (a: Timed, b: Timed) => timeOf(a.beginAt) - timeOf(b.beginAt);

export const byEndAtDesc = (a: Timed, b: Timed) =>
  (timeOf(b.endAt) || timeOf(b.beginAt)) - (timeOf(a.endAt) || timeOf(a.beginAt));
