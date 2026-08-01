import type { PostHog } from "posthog-js";

type PostHogPublicConfig = {
  publicKey: string;
  host: string;
};

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;

export async function loadPostHogClient(config: PostHogPublicConfig): Promise<PostHog | null> {
  if (!import.meta.client) {
    return null;
  }

  if (client) {
    return client;
  }

  if (loading) {
    return loading;
  }

  loading = (async () => {
    if (!config.publicKey) {
      return null;
    }

    const { default: posthog } = await import("posthog-js");

    posthog.init(config.publicKey, {
      api_host: config.host,
      ui_host: "https://eu.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: true,
      disable_session_recording: true,
      persistence: "localStorage+cookie",
      __add_tracing_headers: ["localhost", "api.sarpbc.org"],
    });

    if (import.meta.dev) {
      posthog.opt_out_capturing();
      posthog.set_config({ disable_session_recording: true, autocapture: false });
    }

    client = posthog;
    return posthog;
  })();

  return loading;
}

export function getLoadedPostHogClient(): PostHog | null {
  return client;
}
