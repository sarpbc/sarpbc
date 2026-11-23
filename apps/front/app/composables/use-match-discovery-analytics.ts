import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/match-discovery-analytics";

export const useMatchDiscoveryAnalytics = () => {
  const posthog = usePostHog();

  const trackMatchRowClicked = (input: {
    matchId: string;
    source: MatchDiscoverySource;
    status: MatchDiscoveryStatus;
  }) => {
    posthog.capture("match_row_clicked", {
      match_id: input.matchId,
      source: input.source,
      status: input.status,
    });
  };

  const trackMatchDetailViewed = (input: { matchId: string; status: MatchDiscoveryStatus }) => {
    posthog.capture("match_detail_viewed", {
      match_id: input.matchId,
      status: input.status,
    });
  };

  return {
    trackMatchDetailViewed,
    trackMatchRowClicked,
  };
};
