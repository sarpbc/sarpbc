import type { User } from "@sarpbc/types";
import type { AutocaptureConfig, PostHog } from "posthog-js";
import { sanitizePostHogEvent, sanitizePostHogUrl } from "~/utils/posthog-privacy";

interface PostHogPublicConfig {
  publicKey: string;
  host: string;
}

type PostHogUser = Pick<User, "id" | "userName">;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let consentGranted = false;
let tracingHost = "";

// `undefined` means the session is not hydrated yet, so the current identity is kept.
let currentUser: PostHogUser | null | undefined;

const autocapture: AutocaptureConfig = {
  capture_copied_text: false,
  dom_event_allowlist: ["click", "change", "submit"],
};

const applyIdentity = (): void => {
  if (!client || !consentGranted || currentUser === undefined) {
    return;
  }

  if (currentUser) {
    client.identify(currentUser.id, { username: currentUser.userName });

    return;
  }

  if (client.get_property("$user_state") === "identified") {
    // reset() restores the default opted-out consent state.
    client.reset();
    client.opt_in_capturing({ captureEventName: false });
  }
};

const applyConsent = (): void => {
  if (!client) {
    return;
  }

  if (consentGranted) {
    client.set_config({
      autocapture,
      capture_dead_clicks: true,
      capture_heatmaps: true,
      capture_pageleave: true,
      tracing_headers: [tracingHost],
    });
    client.opt_in_capturing({ captureEventName: false });
    client.startSessionRecording({
      event_trigger: true,
      linked_flag: true,
      sampling: true,
      url_trigger: true,
    });
    applyIdentity();

    return;
  }

  client.opt_out_capturing();
  client.stopSessionRecording();
  client.set_config({
    autocapture: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_pageleave: false,
    tracing_headers: [],
  });
  client.reset(true);
};

export const setPostHogConsent = (accepted: boolean, apiBase: string): void => {
  consentGranted = accepted;
  tracingHost = new URL(apiBase).hostname;
  applyConsent();
};

export const setPostHogUser = (user: PostHogUser | null | undefined): void => {
  currentUser = user && { id: user.id, userName: user.userName };
  applyIdentity();
};

export const loadPostHogClient = async function loadPostHogClient(
  config: PostHogPublicConfig,
): Promise<PostHog | null> {
  if (import.meta.server || import.meta.dev || !config.publicKey || !consentGranted) {
    return null;
  }

  if (client) {
    return client;
  }

  if (loading) {
    return await loading;
  }

  loading = (async () => {
    const { default: posthog } = await import("posthog-js");

    if (!consentGranted) {
      return null;
    }

    posthog.init(config.publicKey, {
      api_host: config.host,
      autocapture: false,
      before_send: (event) => (consentGranted ? sanitizePostHogEvent(event) : null),
      capture_dead_clicks: false,
      // Exception messages can contain form values.
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_pageleave: false,
      capture_pageview: false,
      // Web vitals observers can only start at init, which already requires consent.
      capture_performance: { network_timing: false, web_vitals: true },
      defaults: "2026-08-30",
      disable_capture_url_hashes: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      enable_recording_console_log: false,
      mask_all_element_attributes: true,
      mask_all_text: true,
      mask_personal_data_properties: true,
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      persistence: "sessionStorage",
      persistence_name: "visit",
      person_profiles: "identified_only",
      session_recording: {
        captureCanvas: { recordCanvas: false },
        inlineStylesheet: true,
        maskAllElementAttributes: false,
        maskAllInputs: true,
        maskCapturedNetworkRequestFn: (request) => ({
          ...request,
          name: sanitizePostHogUrl(request.name),
        }),
        maskTextSelector: ".ph-mask, [contenteditable]:not([contenteditable='false'])",
        recordBody: false,
        recordCrossOriginIframes: false,
        recordHeaders: false,
      },
      ui_host: "https://eu.posthog.com",
    });

    client = posthog;
    applyConsent();

    return posthog;
  })()
    .catch(() => {
      console.warn("PostHog could not be initialized");

      return null;
    })
    .finally(() => {
      loading = null;
    });

  return await loading;
};

export const getLoadedPostHogClient = (): PostHog | null => client;
