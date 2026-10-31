const LIVE_MATCH_REFRESH_INTERVAL_MS = 20_000;

export function useLiveMatchRefresh(key: MaybeRefOrGetter<string>, hasLive: () => boolean) {
  if (import.meta.server) {
    return;
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let stopWatch: (() => void) | null = null;
  let disposed = false;

  function clear() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  onNuxtReady(() => {
    if (disposed) {
      return;
    }

    stopWatch = watch(
      hasLive,
      (live) => {
        clear();
        if (!live) {
          return;
        }

        void refreshNuxtData(toValue(key));
        timer = setInterval(() => {
          void refreshNuxtData(toValue(key));
        }, LIVE_MATCH_REFRESH_INTERVAL_MS);
      },
      { immediate: true },
    );
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      stopWatch?.();
      clear();
    });
  }
}
