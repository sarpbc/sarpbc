import type { UpcomingMatchesResponse } from "@sarpbc/types";
import { UPCOMING_MATCHES_KEY } from "~/composables/matches/use-upcoming-matches";

export default defineNuxtPlugin(() => {
  const { data } = useNuxtData<UpcomingMatchesResponse>(UPCOMING_MATCHES_KEY);
  useLiveMatchRefresh(UPCOMING_MATCHES_KEY, () => (data.value?.live.length ?? 0) > 0);
});
