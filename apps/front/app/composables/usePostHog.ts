import type { PostHog } from "posthog-js";
import { loadPostHogClient } from "~/utils/posthog-client";

type PostHogClient = Pick<PostHog, "capture" | "reset">;

/**
 * Consent-gated PostHog client (`capture` / `reset` no-op until cookies accepted).
 *
 * Named product events (non-exhaustive):
 * - auth: `user_logged_in`, `user_signed_up`, `user_logged_out`
 * - airriddle: `airriddle_guess_submitted`, `airriddle_game_won`, `airriddle_game_lost`
 * - pickem: `pickem_tournament_opened`, `pickem_pick_submitted`, …
 * - discussion: `comment_posted`
 * - match discovery CTR: `match_row_clicked`, `match_detail_viewed`
 *   (see `useMatchDiscoveryAnalytics` — sources: matches_list | results_list | home_strip | lateral_bar | tournament_hub)
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
