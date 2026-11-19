import { isDeepStrictEqual } from "node:util";

export const unchangedJson = <T>(current: T, next: T) =>
  isDeepStrictEqual(current, next) ? current : next;
