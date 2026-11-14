import type { UpcomingMatchesResponse } from "@sarpbc/types";

export const UPCOMING_MATCHES_KEY = "upcoming-matches";

export const useUpcomingMatches = async () =>
  await useLazyAsyncData<UpcomingMatchesResponse>(
    UPCOMING_MATCHES_KEY,
    async () => await getSidebarUpcomingMatches(),
  );
