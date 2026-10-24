<script lang="ts" setup>
import { matchPath } from "@sarpbc/utils";
import type { MatchRowItem } from "~/types/matches";
import {
  MATCH_DISCOVERY_FROM_QUERY,
  listVariantToDiscoveryStatus,
  type MatchDiscoverySource,
  type MatchDiscoveryStatus,
} from "~/utils/matchDiscoveryAnalytics";

const {
  matches,
  variant,
  source,
  liveMatchIds,
  showDate = true,
} = defineProps<{
  matches: MatchRowItem[];
  variant: "live" | "upcoming" | "result";
  /** When set, links carry `?from=` and emit `match_row_clicked`. */
  source?: MatchDiscoverySource;
  /** Match ids treated as live when mixed into an upcoming schedule list. */
  liveMatchIds?: ReadonlySet<string>;
  showDate?: boolean;
}>();

const localePath = useLocalePath();
const { trackMatchRowClicked } = useMatchDiscoveryAnalytics();

function isLive(matchId: string): boolean {
  return variant === "live" || Boolean(liveMatchIds?.has(matchId));
}

function statusFor(matchId: string): MatchDiscoveryStatus {
  if (variant === "result") {
    return listVariantToDiscoveryStatus(variant);
  }
  return isLive(matchId) ? "live" : "upcoming";
}

function href(match: MatchRowItem): string {
  const path = localePath(matchPath(match.publicId, match.slug));
  return source ? `${path}?${MATCH_DISCOVERY_FROM_QUERY}=${source}` : path;
}

const onClick = useLinkDelegation((link) => {
  const matchId = link.dataset.matchId;
  if (!source || !matchId) {
    return;
  }
  trackMatchRowClicked({ matchId, source, status: statusFor(matchId) });
});
</script>

<template>
  <div
    class="flex flex-col skip-offscreen"
    :style="{ containIntrinsicBlockSize: `auto calc(var(--spacing-row) * ${matches.length})` }"
    @click="onClick"
  >
    <a
      v-for="match in matches"
      :key="match.id"
      :href="href(match)"
      :data-match-id="match.id"
      class="block interactive-surface touch-manipulation"
    >
      <MatchResultRow v-if="variant === 'result'" :match="match" />
      <MatchRow v-else :match="match" :live="isLive(match.id)" :show-date="showDate" />
    </a>
  </div>
</template>
