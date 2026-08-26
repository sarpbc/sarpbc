import type { UpcomingMatchesResponse } from "~/types/matches";

export const UPCOMING_MATCHES_KEY = "upcoming-matches";

export function useUpcomingMatches() {
  return useLazyAsyncData<UpcomingMatchesResponse>(UPCOMING_MATCHES_KEY, () =>
    getUpcomingMatches(),
  );
}
