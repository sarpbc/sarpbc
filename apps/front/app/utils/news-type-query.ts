import { isNonEmptyString } from "@sarpbc/utils";
import { NEWS_TYPES } from "@sarpbc/types";
import type { NewsType } from "@sarpbc/types";

export const isNewsType = (value: string): value is NewsType => {
  for (const type of NEWS_TYPES) {
    if (type === value) {
      return true;
    }
  }

  return false;
};

export const resolveNewsType = (value: string | null | undefined): NewsType =>
  isNonEmptyString(value) && isNewsType(value) ? value : "short";
