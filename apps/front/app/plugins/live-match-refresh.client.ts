import type { UpcomingMatchesResponse } from "~/types/matches";
import { UPCOMING_MATCHES_KEY } from "~/composables/matches/useUpcomingMatches";

const LIVE_MATCH_REFRESH_INTERVAL_MS = 20_000;

/**
 * Keep live rails current after hydrate (SAR-160 / SAR-73).
 *
 * Homepage SWR can stamp stale scores into the document. Default `useAsyncData`
 * cache already reuses the payload while hydrating and hits the network on
 * `refresh()`. This plugin owns one timer for the shared `upcoming-matches` key
 * so neither rail has to. `onNuxtReady` waits for suspense + idle so we do not
 * mutate data during hydration.
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
