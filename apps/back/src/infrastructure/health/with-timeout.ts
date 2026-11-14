import { setTimeout as delay } from "node:timers/promises";

export const HEALTH_PING_TIMEOUT_MS = 1000;

export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> => {
  const cancelTimer = new AbortController();

  const timeout = delay(ms, undefined, { signal: cancelTimer.signal }).then(() => {
    throw new Error(message);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    cancelTimer.abort();
  }
};
