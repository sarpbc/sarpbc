export const LIVE_MATCH_REFRESH_INTERVAL_MS = 20_000;

export type AsyncDataRefreshCause = "initial" | "refresh:manual" | "refresh:hook" | "watch";

export function hasLiveMatches(data: { live?: readonly unknown[] } | null | undefined): boolean {
  return (data?.live?.length ?? 0) > 0;
}

/**
 * Payload reuse is for hydration / first paint only.
 * Manual and hook refreshes must hit the network so live scores can move.
 */
export function shouldReuseUpcomingMatchesCache(cause: AsyncDataRefreshCause): boolean {
  switch (cause) {
    case "initial":
      return true;
    case "refresh:manual":
    case "refresh:hook":
    case "watch":
      return false;
    default: {
      const _exhaustive: never = cause;
      return _exhaustive;
    }
  }
}

export type LiveMatchRefreshScheduler = {
  start: () => void;
  stop: () => void;
  sync: (hasLive: boolean) => void;
  isRunning: () => boolean;
};

export function createLiveMatchRefreshScheduler(options: {
  intervalMs: number;
  refresh: () => void | Promise<unknown>;
}): LiveMatchRefreshScheduler {
  let timer: ReturnType<typeof setInterval> | null = null;

  function start(): void {
    if (timer !== null) {
      return;
    }

    timer = setInterval(() => {
      void options.refresh();
    }, options.intervalMs);
  }

  function stop(): void {
    if (timer === null) {
      return;
    }

    clearInterval(timer);
    timer = null;
  }

  function sync(hasLive: boolean): void {
    if (hasLive) {
      start();
      return;
    }

    stop();
  }

  return {
    start,
    stop,
    sync,
    isRunning: () => timer !== null,
  };
}
