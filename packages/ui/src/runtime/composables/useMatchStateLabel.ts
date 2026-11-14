import type { MatchBlockItem } from "@sarpbc/types";
import { isNonEmptyString } from "@sarpbc/utils";

export function useMatchStateLabel(
  t: (key: string) => string,
  formatBeginAt: (beginAt: Date) => string,
) {
  return (item: MatchBlockItem): string => {
    switch (item.state) {
      case "live":
        return t("newsTag.matchLive");
      case "finished":
        return t("newsTag.matchFinal");
      case "upcoming":
        return isNonEmptyString(item.beginAt)
          ? formatBeginAt(new Date(item.beginAt))
          : t("newsTag.matchTbd");
      default: {
        const exhaustive: never = item.state;

        return exhaustive;
      }
    }
  };
}
