import type { BeforeSendFn, CaptureResult, PostHogConfig } from "posthog-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  set_config: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: sdk }));

const config = { publicKey: "test-project", host: "https://analytics.example.com" };

function capturedEvent(): CaptureResult {
  return {
    uuid: "event-1",
    event: "$pageview",
    properties: { token: "test-project", distinct_id: "random-visitor" },
  };
}

describe("PostHog visit consent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not initialize before consent, on the server or without a project token", async () => {
    const { loadPostHogClient, setPostHogConsent } = await import("./posthog-client");
    expect(await loadPostHogClient(config)).toBeNull();
    setPostHogConsent(true);
    expect(await loadPostHogClient({ ...config, publicKey: "" })).toBeNull();
    vi.stubGlobal("window", undefined);
    expect(await loadPostHogClient(config)).toBeNull();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("loads one client for concurrent events and starts a masked, account-independent visit", async () => {
    const { loadPostHogClient, setPostHogConsent } = await import("./posthog-client");
    setPostHogConsent(true);
    const [first, second] = await Promise.all([
      loadPostHogClient(config),
      loadPostHogClient(config),
    ]);
    expect(first).toBe(second);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith(
      config.publicKey,
      expect.objectContaining({
        person_profiles: "never",
        persistence: "sessionStorage",
        capture_pageview: false,
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        session_recording: expect.objectContaining({
          maskAllInputs: true,
          maskTextSelector: "*",
          maskAllElementAttributes: true,
          recordHeaders: false,
          recordBody: false,
        }),
      }),
    );
    expect(sdk.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(sdk.startSessionRecording).toHaveBeenCalledWith({
      sampling: true,
      linked_flag: true,
      url_trigger: true,
      event_trigger: true,
    });
    const options = sdk.init.mock.calls[0]?.[1] as PostHogConfig;
    expect(
      options.session_recording.maskCapturedNetworkRequestFn?.({
        name: "https://sarpbc.org/login?email=private@example.com#token",
        duration: 0,
        entryType: "navigation",
        startTime: 0,
      }),
    ).toEqual({
      name: "https://sarpbc.org/login",
      duration: 0,
      entryType: "navigation",
      startTime: 0,
    });
  });

  it("cancels initialization when consent is withdrawn during the SDK import and can retry", async () => {
    const { loadPostHogClient, setPostHogConsent } = await import("./posthog-client");
    setPostHogConsent(true);
    const pending = loadPostHogClient(config);
    setPostHogConsent(false);
    expect(await pending).toBeNull();
    expect(sdk.init).not.toHaveBeenCalled();
    setPostHogConsent(true);
    expect(await loadPostHogClient(config)).toBe(sdk);
  });

  it("blocks outgoing events, stops recording and removes tracing headers on withdrawal", async () => {
    const { loadPostHogClient, setPostHogConsent } = await import("./posthog-client");
    setPostHogConsent(true);
    await loadPostHogClient(config);
    const options = sdk.init.mock.calls[0]?.[1] as PostHogConfig;
    const beforeSend = options.before_send as BeforeSendFn;
    expect(beforeSend(capturedEvent())).not.toBeNull();
    expect(beforeSend(null)).toBeNull();
    setPostHogConsent(false);
    expect(beforeSend(capturedEvent())).toBeNull();
    expect(sdk.opt_out_capturing).toHaveBeenCalledOnce();
    expect(sdk.stopSessionRecording).toHaveBeenCalledOnce();
    expect(sdk.set_config).toHaveBeenLastCalledWith({
      autocapture: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      tracing_headers: [],
    });
    expect(sdk.reset).toHaveBeenCalledWith(true);
    expect(await loadPostHogClient(config)).toBeNull();
    setPostHogConsent(true);
    expect(await loadPostHogClient(config)).toBe(sdk);
    expect(beforeSend(capturedEvent())).not.toBeNull();
  });

  it("does not break the app on an initialization failure and allows another attempt", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    sdk.init.mockImplementationOnce(() => {
      throw new Error("SDK unavailable");
    });
    const { loadPostHogClient, setPostHogConsent } = await import("./posthog-client");
    setPostHogConsent(true);
    expect(await loadPostHogClient(config)).toBeNull();
    expect(await loadPostHogClient(config)).toBe(sdk);
  });
});
