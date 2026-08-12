import type { MatchResultsResponse } from "~/types/matches";

export function useResultsListPage() {
  const page = useOffsetMatchListPage<MatchResultsResponse>({
    keyPrefix: "matches-results",
    fetch: getMatchesResults,
    total: (data) => data?.total ?? 0,
  });

  const pastMatches = computed(() => page.data.value?.results ?? []);
  const hasMatches = computed(() => pastMatches.value.length > 0);

  return {
    offset: page.offset,
    pending: page.pending,
    error: page.error,
    refresh: page.refresh,
    pastMatches,
    totalMatches: page.totalMatches,
    hasMatches,
    currentPage: page.currentPage,
    totalPages: page.totalPages,
    hasPrevious: page.hasPrevious,
    hasNext: page.hasNext,
    getPageQuery: page.getPageQuery,
  };
}
