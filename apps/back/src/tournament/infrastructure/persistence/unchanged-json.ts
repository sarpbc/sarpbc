import { isDeepStrictEqual } from "node:util";

export function unchangedJson<T>(current: T, next: T): T {
  return isDeepStrictEqual(current, next) ? current : next;
}
