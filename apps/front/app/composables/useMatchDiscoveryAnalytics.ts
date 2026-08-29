import {
  buildMatchDetailTo,
  type MatchDiscoverySource,
  type MatchDiscoveryStatus,
} from "~/utils/matchDiscoveryAnalytics";

interface MatchDetailViewedProperties {
  match_id: string;
  status: MatchDiscoveryStatus;
  source?: MatchDiscoverySource;
}

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
    const properties: MatchDetailViewedProperties = {
      match_id: input.matchId,
      status: input.status,
    };
    if (input.source) {
      properties.source = input.source;
    }
    posthog.capture("match_detail_viewed", properties);
  }

  return {
    matchDetailTo,
    trackMatchRowClicked,
    trackMatchDetailViewed,
  };
}
