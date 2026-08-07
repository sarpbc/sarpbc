<script lang="ts" setup>
import type { MatchListItem } from "~/types/matches";
import type { MatchDiscoverySource } from "~/utils/matchDiscoveryAnalytics";
import { listVariantToDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

const { matches, variant, title, discoverySource } = defineProps<{
  matches: MatchListItem[];
  variant: "live" | "upcoming" | "result";
  title?: string;
  /** When set, links carry `?from=` and emit `match_row_clicked`. */
  discoverySource?: MatchDiscoverySource;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const eventGroups = computed(() =>
  groupMatchesByEvent(matches, t("page.matches.unknownTournament")),
);

const discoveryStatus = computed(() => listVariantToDiscoveryStatus(variant));

function matchLinkTo(matchId: string) {
  if (discoverySource) {
    return matchDetailTo(matchId, discoverySource);
  }
  return localePath(`/matches/${matchId}`);
}

function onMatchRowClick(matchId: string) {
  if (!discoverySource) {
    return;
  }
  trackMatchRowClicked({
    matchId,
    source: discoverySource,
    status: discoveryStatus.value,
  });
}
</script>

<template>
  <section
    class="w-full flex flex-col"
    :class="variant === 'live' ? 'gap-2' : undefined"
    :aria-label="variant === 'live' ? title : undefined"
  >
    <div
      v-if="title"
      class="flex items-center gap-2 pl-1"
      :class="variant === 'live' ? 'sticky top-header z-10 bg-default py-1' : undefined"
    >
      <h2
        class="text-sm font-medium"
        :class="variant === 'live' ? 'text-highlighted' : 'text-toned'"
      >
        {{ title }}
      </h2>
    </div>

    <div v-for="group in eventGroups" :key="group.key" class="flex flex-col gap-px">
      <h3 class="flex text-sm font-medium text-toned h-10.75 items-end">
        <ULink
          v-if="group.tournamentId"
          :to="$localePath(`/tournaments/${group.tournamentId}/matches`)"
          class="hover:text-highlighted h-fit"
        >
          {{ group.displayName }}
        </ULink>
        <span v-else>{{ group.displayName }}</span>
      </h3>
      <UiCard
        flush-bottom
        class="flex flex-col"
        :class="variant === 'live' ? 'border-error/30 bg-error/5 ring-1 ring-error/15' : undefined"
      >
        <div v-for="match in group.matches" :key="match.id">
          <ULink
            :to="matchLinkTo(match.id)"
            class="block hover:bg-elevated/50 transition-colors"
            @click="onMatchRowClick(match.id)"
          >
            <MatchRow v-if="variant !== 'result'" :match="match" :live="variant === 'live'" />
            <MatchResultRow v-else :match="match" />
          </ULink>
        </div>
      </UiCard>
    </div>
  </section>
</template>
