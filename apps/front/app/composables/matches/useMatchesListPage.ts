import type { MatchListItem, UpcomingMatchesResponse } from "~/types/matches";

function matchBeginTime(match: MatchListItem): number {
  return match.beginAt ? new Date(match.beginAt).getTime() : 0;
}

export function useMatchesListPage() {
  const page = useOffsetMatchListPage<UpcomingMatchesResponse>({
    keyPrefix: "matches-schedule",
    fetch: getUpcomingMatches,
    total: (data) => data?.total ?? 0,
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

    return Array.from(byId.values()).sort((a, b) => matchBeginTime(a) - matchBeginTime(b));
  });

  const hasMatches = computed(() => scheduleMatches.value.length > 0);

  return {
    offset: page.offset,
    pending: page.pending,
    error: page.error,
    refresh: page.refresh,
    scheduleMatches,
    liveMatchIds,
    totalMatches: page.totalMatches,
    hasMatches,
    currentPage: page.currentPage,
    totalPages: page.totalPages,
    hasPrevious: page.hasPrevious,
    hasNext: page.hasNext,
    getPageQuery: page.getPageQuery,
  };
}
