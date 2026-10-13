import type { PostHog } from "posthog-js";
import { loadPostHogClient } from "~/utils/posthog-client";

type PostHogClient = Pick<PostHog, "capture">;
export function usePostHog(): PostHogClient {
  const { isAccepted } = useCookieConsent();
  const config = useRuntimeConfig();

  const run = (fn: (client: PostHog) => void) => {
    if (!import.meta.client || !isAccepted()) {
      return;
    }

    void loadPostHogClient(config.public.posthog).then((client) => {
      if (isAccepted() && client?.has_opted_in_capturing()) {
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
  };
}
