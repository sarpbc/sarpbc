import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLiveMatchRefreshScheduler,
  hasLiveMatches,
  LIVE_MATCH_REFRESH_INTERVAL_MS,
  shouldReuseUpcomingMatchesCache,
} from "./liveMatchRefresh";

const nuxtConfig = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../nuxt.config.ts"),
  "utf8",
);

describe("hasLiveMatches", () => {
  it("is false when data is missing or live is empty", () => {
    expect(hasLiveMatches(undefined)).toBe(false);
    expect(hasLiveMatches(null)).toBe(false);
    expect(hasLiveMatches({ live: [] })).toBe(false);
  });

  it("is true when any live match is present", () => {
    expect(hasLiveMatches({ live: [{ id: "m1" }] })).toBe(true);
  });
});

describe("shouldReuseUpcomingMatchesCache", () => {
  it("reuses the SSR payload on the initial request", () => {
    expect(shouldReuseUpcomingMatchesCache("initial")).toBe(true);
  });

  it("forces a network fetch for refresh and watch", () => {
    expect(shouldReuseUpcomingMatchesCache("refresh:manual")).toBe(false);
    expect(shouldReuseUpcomingMatchesCache("refresh:hook")).toBe(false);
    expect(shouldReuseUpcomingMatchesCache("watch")).toBe(false);
  });
});

describe("createLiveMatchRefreshScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls only while live matches exist", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const scheduler = createLiveMatchRefreshScheduler({
      intervalMs: LIVE_MATCH_REFRESH_INTERVAL_MS,
      refresh,
    });

    scheduler.sync(false);
    vi.advanceTimersByTime(LIVE_MATCH_REFRESH_INTERVAL_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    expect(scheduler.isRunning()).toBe(false);

    scheduler.sync(true);
    expect(scheduler.isRunning()).toBe(true);
    vi.advanceTimersByTime(LIVE_MATCH_REFRESH_INTERVAL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    scheduler.sync(true);
    vi.advanceTimersByTime(LIVE_MATCH_REFRESH_INTERVAL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);

    scheduler.sync(false);
    expect(scheduler.isRunning()).toBe(false);
    vi.advanceTimersByTime(LIVE_MATCH_REFRESH_INTERVAL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not start a second interval while already running", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const scheduler = createLiveMatchRefreshScheduler({
      intervalMs: LIVE_MATCH_REFRESH_INTERVAL_MS,
      refresh,
    });

    scheduler.start();
    scheduler.start();
    vi.advanceTimersByTime(LIVE_MATCH_REFRESH_INTERVAL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });
});

describe("homepage SWR", () => {
  it("keeps 60s SWR on / and /fr", () => {
    expect(nuxtConfig).toContain("const listHubSwr = { swr: 60 } as const");
    expect(nuxtConfig).toContain('"/": listHubSwr');
    expect(nuxtConfig).toContain('"/fr": listHubSwr');
  });
});
