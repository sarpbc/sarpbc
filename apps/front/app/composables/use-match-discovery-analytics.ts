import type { MatchLinkTarget } from "~/types/matches";
import { buildMatchDetailTo } from "~/utils/match-discovery-analytics";
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/match-discovery-analytics";

interface MatchDetailViewedProperties {
  match_id: string;
  status: MatchDiscoveryStatus;
  source?: MatchDiscoverySource;
}

export const useMatchDiscoveryAnalytics = () => {
  const posthog = usePostHog();
  const localePath = useLocalePath();

  const matchDetailTo = (match: MatchLinkTarget, source: MatchDiscoverySource) =>
    buildMatchDetailTo(localePath, match, source);

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

  const trackMatchDetailViewed = (input: {
    matchId: string;
    status: MatchDiscoveryStatus;
    source: MatchDiscoverySource | null;
  }) => {
    const properties: MatchDetailViewedProperties = {
      match_id: input.matchId,
      status: input.status,
    };

    if (input.source) {
      properties.source = input.source;
    }

    posthog.capture("match_detail_viewed", properties);
  };

  return {
    matchDetailTo,
    trackMatchRowClicked,
    trackMatchDetailViewed,
  };
};
