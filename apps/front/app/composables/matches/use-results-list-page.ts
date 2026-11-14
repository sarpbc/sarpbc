import type { MatchResultsResponse } from "@sarpbc/types";

export const useResultsListPage = () => {
  const page = useOffsetMatchListPage<MatchResultsResponse>({
    keyPrefix: "matches-results",
    fetch: getMatchesResults,
  });

  const pastMatches = computed(() => page.data.value?.results ?? []);
  const hasMatches = computed(() => pastMatches.value.length > 0);

  return { ...page, pastMatches, hasMatches };
};
