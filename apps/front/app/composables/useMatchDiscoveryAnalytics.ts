import {
  buildMatchDetailTo,
  type MatchDiscoverySource,
  type MatchDiscoveryStatus,
} from "~/utils/matchDiscoveryAnalytics";

export function useMatchDiscoveryAnalytics() {
  const posthog = usePostHog();
  const localePath = useLocalePath();

  function matchDetailTo(matchId: string, source: MatchDiscoverySource) {
    return buildMatchDetailTo(localePath, matchId, source);
  }

  function trackMatchRowClicked(input: {
    matchId: string;
    source: MatchDiscoverySource;
    status: MatchDiscoveryStatus;
  }) {
    posthog.capture("match_row_clicked", {
      match_id: input.matchId,
      source: input.source,
      status: input.status,
    });
  }

  function trackMatchDetailViewed(input: {
    matchId: string;
    status: MatchDiscoveryStatus;
    source: MatchDiscoverySource | null;
  }) {
    posthog.capture("match_detail_viewed", {
      match_id: input.matchId,
      status: input.status,
      ...(input.source ? { source: input.source } : {}),
    });
  }

  return {
    matchDetailTo,
    trackMatchRowClicked,
    trackMatchDetailViewed,
  };
}
