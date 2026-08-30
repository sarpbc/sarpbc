import type { UpcomingMatchesResponse } from "~/types/matches";
import { UPCOMING_MATCHES_KEY } from "~/composables/matches/useUpcomingMatches";

const LIVE_MATCH_REFRESH_INTERVAL_MS = 20_000;

/**
 * Poll live rails after hydrate (SAR-160). One timer on the shared
 * `upcoming-matches` key so neither rail owns the interval. `onNuxtReady`
 * waits for suspense + idle so we do not mutate data during hydration.
 */
export default defineNuxtPlugin(() => {
  const { data } = useNuxtData<UpcomingMatchesResponse>(UPCOMING_MATCHES_KEY);

  onNuxtReady(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    watch(
      () => (data.value?.live.length ?? 0) > 0,
      (hasLive) => {
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }

        if (!hasLive) {
          return;
        }

        void refreshNuxtData(UPCOMING_MATCHES_KEY);
        timer = setInterval(() => {
          void refreshNuxtData(UPCOMING_MATCHES_KEY);
        }, LIVE_MATCH_REFRESH_INTERVAL_MS);
      },
      { immediate: true },
    );
  });
});
