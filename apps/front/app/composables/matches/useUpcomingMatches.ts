import type { UpcomingMatchesResponse } from "~/types/matches";

const UPCOMING_MATCHES_KEY = "upcoming-matches";

export function useUpcomingMatches() {
  return useLazyAsyncData<UpcomingMatchesResponse>(
    UPCOMING_MATCHES_KEY,
    () => getUpcomingMatches(),
    {
      getCachedData(key, nuxtApp) {
        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      },
    },
  );
}
