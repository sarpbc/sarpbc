import type { PostHog } from "posthog-js";
import { loadPostHogClient } from "~/utils/posthog-client";

type PostHogClient = Pick<PostHog, "capture">;

export function usePostHog(): PostHogClient {
  const { choice } = useCookieConsent();
  const config = useRuntimeConfig();

  const run = (fn: (client: PostHog) => void) => {
    if (!import.meta.client || choice.value !== "accepted") {
      return;
    }

    void loadPostHogClient(config.public.posthog).then((client) => {
      if (choice.value === "accepted" && client?.has_opted_in_capturing() === true) {
        fn(client);
      }

      return client;
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
