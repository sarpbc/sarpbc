import { isoWeekIdFromDate } from "@sarpbc/utils";
import type { NewsArticleListItem } from "~/types/news";

export type NewsFeedEntry =
  | { kind: "article"; article: NewsArticleListItem }
  | { kind: "shortWeek"; week: string; latest: NewsArticleListItem };

/**
 * Folds every short of an ISO week into one entry headed by its newest short.
 * Expects newest-first input, so a past week's entry never changes once the week ends.
 */
export function buildNewsFeed(items: readonly NewsArticleListItem[]): NewsFeedEntry[] {
  const seenWeeks = new Set<string>();
  const entries: NewsFeedEntry[] = [];

  for (const item of items) {
    switch (item.type) {
      case "article":
        entries.push({ kind: "article", article: item });
        break;
      case "short": {
        const week = isoWeekIdFromDate(new Date(item.createdAt));

        if (!seenWeeks.has(week)) {
          seenWeeks.add(week);
          entries.push({ kind: "shortWeek", week, latest: item });
        }

        break;
      }

      default: {
        const _exhaustive: never = item.type;

        return _exhaustive;
      }
    }
  }

  return entries;
}
