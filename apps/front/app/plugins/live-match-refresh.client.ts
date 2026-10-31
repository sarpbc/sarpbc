import type { UpcomingMatchesResponse } from "~/types/matches";
import { UPCOMING_MATCHES_KEY } from "~/composables/matches/useUpcomingMatches";

export default defineNuxtPlugin(() => {
  const { data } = useNuxtData<UpcomingMatchesResponse>(UPCOMING_MATCHES_KEY);
  useLiveMatchRefresh(UPCOMING_MATCHES_KEY, () => (data.value?.live.length ?? 0) > 0);
});
