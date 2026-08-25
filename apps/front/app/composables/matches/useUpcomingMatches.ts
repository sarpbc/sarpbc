import type { UpcomingMatchesResponse } from "~/types/matches";
import {
  createLiveMatchRefreshScheduler,
  hasLiveMatches,
  LIVE_MATCH_REFRESH_INTERVAL_MS,
  shouldReuseUpcomingMatchesCache,
} from "./liveMatchRefresh";

const UPCOMING_MATCHES_KEY = "upcoming-matches";

let liveRefreshBound = false;

export function useUpcomingMatches() {
  const result = useLazyAsyncData<UpcomingMatchesResponse>(
    UPCOMING_MATCHES_KEY,
    () => getUpcomingMatches(),
    {
      getCachedData(key, nuxtApp, ctx) {
        if (!shouldReuseUpcomingMatchesCache(ctx.cause)) {
          return undefined;
        }

        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      },
    },
  );

  if (import.meta.client) {
    bindLiveUpcomingMatchesRefresh(result.data, result.refresh);
  }

  return result;
}

/**
 * Poll live rails after hydrate (SAR-160 / SAR-73).
 *
 * `onNuxtReady` waits for suspense + idle so we do not mutate async data during
 * hydration. Lateral bar and mobile home strip share this key, so one poller
 * updates both. The interval runs only while `live` is non-empty.
 */
function bindLiveUpcomingMatchesRefresh(
  data: { readonly value: UpcomingMatchesResponse | null | undefined },
  refresh: () => Promise<unknown>,
): void {
  if (liveRefreshBound) {
    return;
  }
  liveRefreshBound = true;

  const scheduler = createLiveMatchRefreshScheduler({
    intervalMs: LIVE_MATCH_REFRESH_INTERVAL_MS,
    refresh,
  });
  const hydrated = ref(false);

  onNuxtReady(() => {
    hydrated.value = true;
  });

  watch(
    [hydrated, () => hasLiveMatches(data.value)],
    ([isHydrated, live]) => {
      if (!isHydrated) {
        scheduler.stop();
        return;
      }

      const alreadyPolling = scheduler.isRunning();
      scheduler.sync(live);
      if (live && !alreadyPolling) {
        void refresh();
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    scheduler.stop();
    liveRefreshBound = false;
  });
}
