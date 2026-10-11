<script lang="ts" setup>
import { filterMatchesTodayOrTomorrow } from "~/utils/calendarDay";
import { resolveMatchRailTitleKind } from "~/utils/matchRailTitle";

const { t } = useI18n();
const { data } = await useUpcomingMatches();
const { data: results } = await useLazyAsyncData(`matches-results`, () => getMatchesResults(), {
  getCachedData(key, nuxtApp) {
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const SOURCE = "lateral_bar" as const;
const MAX_LIVE_MATCHES = 5;

const liveMatches = computed(() => data.value?.live ?? []);
const visibleLiveMatches = computed(() => liveMatches.value.slice(0, MAX_LIVE_MATCHES));
const hasHiddenLive = computed(() => liveMatches.value.length > MAX_LIVE_MATCHES);
const upcomingMatches = computed(() => filterMatchesTodayOrTomorrow(data.value?.upcoming ?? []));
const hasSchedule = computed(
  () => liveMatches.value.length > 0 || upcomingMatches.value.length > 0,
);
const resultMatches = computed(() => results.value?.results ?? []);
const hasResults = computed(() => resultMatches.value.length > 0);

const upcomingTitle = computed(() => {
  const kind = resolveMatchRailTitleKind(liveMatches.value, upcomingMatches.value);

  switch (kind) {
    case "today":
      return t("components.match.todaysMatch");
    case "tomorrow":
      return t("components.match.tomorrowsMatch");
    case "upcoming":
      return t("components.match.upcomingMatches");
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div class="w-full flex flex-col">
    <SRail v-if="hasSchedule" caption="lead" :title="upcomingTitle">
      <SCard flush-bottom flush-top>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="(match, index) in visibleLiveMatches"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="live"
          >
            <MatchRow :match="match" :live="true" :divider-top="index === 0" />
          </MatchDiscoveryLink>
          <SListItem
            v-if="hasHiddenLive"
            :to="$localePath('/matches')"
            divider
            class="text-xs font-medium text-muted hover:text-highlighted"
          >
            {{ $t("components.match.viewAll") }}
          </SListItem>
          <MatchDiscoveryLink
            v-for="(match, index) in upcomingMatches"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="upcoming"
          >
            <MatchRow :match="match" :divider-top="liveMatches.length === 0 && index === 0" />
          </MatchDiscoveryLink>
        </div>
      </SCard>
    </SRail>
    <SRail
      v-if="hasResults"
      :caption="hasSchedule ? 'section' : 'lead'"
      :title="$t('components.match.results')"
    >
      <SCard flush-bottom flush-top>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="(match, index) in resultMatches"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="finished"
          >
            <MatchResultRow :match="match" :divider-top="!hasSchedule && index === 0" />
          </MatchDiscoveryLink>
        </div>
      </SCard>
    </SRail>
  </div>
</template>
