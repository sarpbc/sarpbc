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

const liveMatches = computed(() => data.value?.live ?? []);
const upcomingMatches = computed(() => filterMatchesTodayOrTomorrow(data.value?.upcoming ?? []));

const showUpcomingRail = computed(
  () => liveMatches.value.length > 0 || upcomingMatches.value.length > 0,
);

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
    <UiRail v-if="showUpcomingRail" :title="upcomingTitle">
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="match in liveMatches"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="live"
          >
            <MatchRow :match="match" :live="true" />
          </MatchDiscoveryLink>
          <MatchDiscoveryLink
            v-for="match in upcomingMatches"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="upcoming"
          >
            <MatchRow :match="match" />
          </MatchDiscoveryLink>
        </div>
      </UiCard>
    </UiRail>
    <!-- Secondary section uses h-row so gap matches match-list rhythm -->
    <div v-if="results && results.results.length > 0" class="w-full flex flex-col">
      <h2 class="flex h-row min-h-row items-end pl-2 text-sm font-medium text-toned">
        {{ $t("components.match.results") }}
      </h2>
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="match in results.results"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="finished"
          >
            <MatchResultRow :match="match" />
          </MatchDiscoveryLink>
        </div>
      </UiCard>
    </div>
  </div>
</template>
