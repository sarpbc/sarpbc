import { NEWS_TYPES, type NewsType } from "@sarpbc/types";

export function isNewsType(value: string): value is NewsType {
  for (const type of NEWS_TYPES) {
    if (type === value) {
      return true;
    }
  }
  return false;
}

export function resolveNewsType(value: string | null | undefined): NewsType {
  return value && isNewsType(value) ? value : "short";
}
