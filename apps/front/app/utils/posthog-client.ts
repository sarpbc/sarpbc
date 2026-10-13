import type { AutocaptureConfig, PostHog } from "posthog-js";
import { sanitizePostHogEvent, sanitizePostHogUrl } from "~/utils/posthog-privacy";

type PostHogPublicConfig = {
  publicKey: string;
  host: string;
};

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let consentGranted = false;

const autocapture: AutocaptureConfig = {
  dom_event_allowlist: ["click", "change", "submit"],
  capture_copied_text: false,
};

export function setPostHogConsent(accepted: boolean): void {
  consentGranted = accepted;
  if (!client) {
    return;
  }

  if (accepted) {
    client.set_config({
      autocapture,
      capture_pageleave: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      tracing_headers: ["api.sarpbc.org"],
    });
    client.opt_in_capturing({ captureEventName: false });
    client.startSessionRecording({
      sampling: true,
      linked_flag: true,
      url_trigger: true,
      event_trigger: true,
    });
    return;
  }

  client.opt_out_capturing();
  client.stopSessionRecording();
  client.set_config({
    autocapture: false,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    tracing_headers: [],
  });
  client.reset(true);
}

export async function loadPostHogClient(config: PostHogPublicConfig): Promise<PostHog | null> {
  if (!globalThis.window || import.meta.dev || !config.publicKey || !consentGranted) {
    return null;
  }

  if (client) {
    return client;
  }

  if (loading) {
    return loading;
  }

  loading = (async () => {
    const { default: posthog } = await import("posthog-js");

    if (!consentGranted) {
      return null;
    }

    posthog.init(config.publicKey, {
      api_host: config.host,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      person_profiles: "never",
      persistence: "sessionStorage",
      persistence_name: "visit",
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      // Exception messages can contain form values.
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      enable_recording_console_log: false,
      capture_performance: false,
      mask_all_text: true,
      mask_all_element_attributes: true,
      disable_capture_url_hashes: true,
      mask_personal_data_properties: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        maskAllElementAttributes: true,
        recordHeaders: false,
        recordBody: false,
        recordCrossOriginIframes: false,
        captureCanvas: { recordCanvas: false },
        maskCapturedNetworkRequestFn: (request) => ({
          ...request,
          name: sanitizePostHogUrl(request.name),
        }),
      },
      before_send: (event) => (consentGranted && event ? sanitizePostHogEvent(event) : null),
    });

    client = posthog;
    setPostHogConsent(consentGranted);
    return posthog;
  })()
    .catch(() => {
      console.warn("PostHog could not be initialized");
      return null;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

export function getLoadedPostHogClient(): PostHog | null {
  return client;
}
