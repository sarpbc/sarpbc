import { isNonEmptyString } from "@sarpbc/utils";
import type { MatchListItem, UpcomingMatchesResponse } from "@sarpbc/types";

function matchBeginTime(match: MatchListItem): number {
  return isNonEmptyString(match.beginAt) ? new Date(match.beginAt).getTime() : 0;
}

export function useMatchesListPage() {
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

    return [...byId.values()].sort((a, b) => matchBeginTime(a) - matchBeginTime(b));
  });

  const hasMatches = computed(() => scheduleMatches.value.length > 0);

  return { ...page, scheduleMatches, liveMatchIds, hasMatches };
}
