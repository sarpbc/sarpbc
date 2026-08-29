import type { PostHog } from "posthog-js";
import { loadPostHogClient } from "~/utils/posthog-client";

type PostHogClient = Pick<PostHog, "capture" | "reset">;

/**
 * Consent-gated: `capture` / `reset` no-op until cookies are accepted.
 */
export function usePostHog(): PostHogClient {
  const { isAccepted } = useCookieConsent();
  const config = useRuntimeConfig();

  const run = (fn: (client: PostHog) => void) => {
    if (!isAccepted()) {
      return;
    }

    void loadPostHogClient(config.public.posthog).then((client) => {
      if (client) {
        fn(client);
      }
    });
  };

  return {
    capture: (event, properties) => {
      run((client) => {
        client.capture(event, properties);
      });
    },
    reset: () => {
      run((client) => {
        client.reset();
      });
    },
  };
}
