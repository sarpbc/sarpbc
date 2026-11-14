import type { MatchResultsResponse } from "@sarpbc/types";

export const useResultsListPage = () => {
  const page = useOffsetMatchListPage<MatchResultsResponse>({
    fetch: getMatchesResults,
    keyPrefix: "matches-results",
  });

  const pastMatches = computed(() => page.data.value?.results ?? []);
  const hasMatches = computed(() => pastMatches.value.length > 0);

  return { ...page, hasMatches, pastMatches };
};
