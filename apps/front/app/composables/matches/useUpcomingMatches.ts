import type { UpcomingMatchesResponse } from "@sarpbc/types";

export const UPCOMING_MATCHES_KEY = "upcoming-matches";

export function useUpcomingMatches() {
  return useLazyAsyncData<UpcomingMatchesResponse>(UPCOMING_MATCHES_KEY, () =>
    getUpcomingMatches(),
  );
}
