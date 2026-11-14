import type { UpcomingMatchesResponse } from "@sarpbc/types";

export const UPCOMING_MATCHES_KEY = "upcoming-matches";

export async function useUpcomingMatches() {
  return await useLazyAsyncData<UpcomingMatchesResponse>(
    UPCOMING_MATCHES_KEY,
    async () => await getSidebarUpcomingMatches(),
  );
}
