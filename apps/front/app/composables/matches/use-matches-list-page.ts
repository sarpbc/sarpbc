import { isNonEmptyString } from "@sarpbc/utils";
import type { MatchListItem, UpcomingMatchesResponse } from "@sarpbc/types";

const matchBeginTime = (match: MatchListItem): number =>
  isNonEmptyString(match.beginAt) ? new Date(match.beginAt).getTime() : 0;

export const useMatchesListPage = () => {
  const page = useOffsetMatchListPage<UpcomingMatchesResponse>({
    keyPrefix: "matches-schedule",
    fetch: getUpcomingMatches,
  });

  const liveMatchIds = computed(
    () => new Set((page.data.value?.live ?? []).map((match) => match.id)),
  );

  const scheduleMatches = computed(() => {
    const live = page.data.value?.live ?? [];
    const upcoming = page.data.value?.upcoming ?? [];
    const byId = new Map<string, MatchListItem>();

    for (const match of [...live, ...upcoming]) {
      byId.set(match.id, match);
    }

    return [...byId.values()].toSorted((a, b) => matchBeginTime(a) - matchBeginTime(b));
  });

  const hasMatches = computed(() => scheduleMatches.value.length > 0);

  return { ...page, scheduleMatches, liveMatchIds, hasMatches };
};
