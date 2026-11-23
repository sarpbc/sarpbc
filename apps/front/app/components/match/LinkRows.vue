<script lang="ts" setup>
import { matchPath } from "@sarpbc/utils";
import type { MatchRowItem } from "~/types/matches";
import { listVariantToDiscoveryStatus } from "~/utils/match-discovery-analytics";
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/match-discovery-analytics";

const {
  matches,
  variant,
  source = null,
  liveMatchIds = null,
  showDate = true,
} = defineProps<{
  matches: MatchRowItem[];
  variant: "live" | "upcoming" | "result";
  source?: MatchDiscoverySource | null;
  liveMatchIds?: ReadonlySet<string> | null;
  showDate?: boolean;
}>();

const localePath = useLocalePath();
const { trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const isLive = (matchId: string) => variant === "live" || Boolean(liveMatchIds?.has(matchId));

const statusFor = (matchId: string) => {
  if (variant === "result") {
    return listVariantToDiscoveryStatus(variant);
  }

  return isLive(matchId) ? "live" : "upcoming";
};

const href = (match: MatchRowItem) => localePath(matchPath(match.publicId, match.slug));

const onClick = useLinkDelegation((link) => {
  const { matchId } = link.dataset;

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
