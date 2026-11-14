import { useDocumentVisibility, useIntervalFn } from "@vueuse/core";

const LIVE_MATCH_REFRESH_INTERVAL_MS = 20_000;

export function useLiveMatchRefresh(key: MaybeRefOrGetter<string>, hasLive: () => boolean) {
  if (import.meta.server) {
    return;
  }

  const visibility = useDocumentVisibility();

  const poll = useIntervalFn(
    () => {
      refreshNuxtData(toValue(key)).catch(() => null);
    },
    LIVE_MATCH_REFRESH_INTERVAL_MS,
    {
      immediate: false,
    },
  );

  let stopWatch: (() => void) | null = null;
  let disposed = false;

  onNuxtReady(() => {
    if (disposed) {
      return;
    }

    stopWatch = watch(
      () => hasLive() && visibility.value === "visible",
      (polling) => {
        poll.pause();

        if (!polling) {
          return;
        }

        void refreshNuxtData(toValue(key));
        poll.resume();
      },
      { immediate: true },
    );
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      stopWatch?.();
    });
  }
}
