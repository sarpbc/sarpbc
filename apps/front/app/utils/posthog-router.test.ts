import { effectScope, ref, watch, type EffectScope } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CookieChoice } from "~/composables/cookie";

const tracking = vi.hoisted(() => ({
  enabled: false,
  loaded: false,
  client: {
    capture: vi.fn(),
    has_opted_in_capturing: vi.fn(),
  },
  load: vi.fn(),
  setConsent: vi.fn(),
}));

vi.mock("~/utils/posthog-client", () => ({
  loadPostHogClient: tracking.load,
  setPostHogConsent: tracking.setConsent,
  getLoadedPostHogClient: () => (tracking.loaded ? tracking.client : null),
}));

describe("PostHog pageviews", () => {
  const choice = ref<CookieChoice | null>(null);
  let router: Router;
  let scope: EffectScope;

  beforeEach(async () => {
    vi.resetAllMocks();
    choice.value = null;
    tracking.enabled = false;
    tracking.loaded = false;
    tracking.setConsent.mockImplementation((accepted: boolean) => {
      tracking.enabled = accepted;
    });
    tracking.client.has_opted_in_capturing.mockImplementation(() => tracking.enabled);
    tracking.load.mockImplementation(async () => {
      tracking.loaded = true;
      return tracking.client;
    });
    router = createRouter({
      history: createMemoryHistory(),
      routes: ["/", "/matches", "/profile"].map((path) => ({ path, component: {} })),
    });
    await router.push("/");
    scope = effectScope();
    vi.stubGlobal("defineNuxtPlugin", (setup: () => void) => setup);
    vi.stubGlobal("useRouter", () => router);
    vi.stubGlobal("useCookieConsent", () => ({
      choice,
      isAccepted: () => choice.value === "accepted",
    }));
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { posthog: { publicKey: "test-project", host: "https://analytics.example.com" } },
    }));
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("window", { location: { origin: "https://sarpbc.org" } });
  });

  afterEach(() => {
    scope.stop();
    vi.unstubAllGlobals();
  });

  async function startPlugin() {
    const { default: plugin } = await import("../plugins/posthog-router.client");
    scope.run(plugin as () => void);
  }

  it("does not load PostHog or capture navigation until the visitor accepts", async () => {
    await startPlugin();
    await router.push("/matches");
    expect(tracking.load).not.toHaveBeenCalled();
    expect(tracking.client.capture).not.toHaveBeenCalled();
    choice.value = "accepted";
    await vi.waitFor(() => expect(tracking.client.capture).toHaveBeenCalledOnce());
    expect(tracking.client.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "https://sarpbc.org/matches",
      page_path: "/matches",
    });
  });

  it("captures the initial page once and subsequent query-only navigation without leaking the query", async () => {
    choice.value = "accepted";
    await startPlugin();
    await vi.waitFor(() => expect(tracking.client.capture).toHaveBeenCalledOnce());
    await router.push("/matches?search=private@example.com#private");
    await router.push("/matches?search=other-private-value");
    await router.push("/matches?search=other-private-value");
    expect(tracking.client.capture).toHaveBeenCalledTimes(3);
    expect(tracking.client.capture).toHaveBeenLastCalledWith("$pageview", {
      $current_url: "https://sarpbc.org/matches",
      page_path: "/matches",
    });
  });

  it("ignores aborted navigation and stops pageviews after consent is withdrawn", async () => {
    choice.value = "accepted";
    await startPlugin();
    await vi.waitFor(() => expect(tracking.client.capture).toHaveBeenCalledOnce());
    router.beforeEach((to) => to.path !== "/profile");
    await router.push("/profile");
    expect(tracking.client.capture).toHaveBeenCalledOnce();
    choice.value = "rejected";
    await router.push("/matches");
    expect(tracking.setConsent).toHaveBeenLastCalledWith(false);
    expect(tracking.client.capture).toHaveBeenCalledOnce();
    choice.value = "accepted";
    await vi.waitFor(() => expect(tracking.client.capture).toHaveBeenCalledTimes(2));
  });

  it("does not send a late pageview if consent was withdrawn while loading", async () => {
    let resolveLoad: (() => void) | undefined;
    tracking.load.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    choice.value = "accepted";
    await startPlugin();
    choice.value = "rejected";
    tracking.loaded = true;
    resolveLoad?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(tracking.client.capture).not.toHaveBeenCalled();
  });
});
