import type { MatchBlockItem } from "@sarpbc/types";

export function useMatchStateLabel(formatBeginAt: (beginAt: Date) => string) {
  const { t } = useI18n();

  return (item: MatchBlockItem): string => {
    switch (item.state) {
      case "live":
        return t("newsTag.matchLive");
      case "finished":
        return t("newsTag.matchFinal");
      case "upcoming":
        return item.beginAt ? formatBeginAt(new Date(item.beginAt)) : t("newsTag.matchTbd");
      default: {
        const exhaustive: never = item.state;

        return exhaustive;
      }
    }
  };
}
