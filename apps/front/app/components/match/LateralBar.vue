<script lang="ts" setup>
const { data } = await useUpcomingMatches();
const { data: results } = await useLazyAsyncData(`matches-results`, () => getMatchesResults(), {
  getCachedData(key, nuxtApp) {
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const SOURCE = "lateral_bar" as const;
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

function onLiveOrUpcomingClick(matchId: string, status: "live" | "upcoming") {
  trackMatchRowClicked({ matchId, source: SOURCE, status });
}

function onResultClick(matchId: string) {
  trackMatchRowClicked({ matchId, source: SOURCE, status: "finished" });
}
</script>

<template>
  <div class="w-full flex flex-col">
    <UiRail
      v-if="data && (data.live.length > 0 || data.upcoming.length > 0)"
      :title="$t('components.match.todaysMatch')"
    >
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <ULink
            v-for="match in data.live"
            :key="match.id"
            :to="matchDetailTo(match.id, SOURCE)"
            class="block hover:bg-elevated/50 transition-colors"
            @click="onLiveOrUpcomingClick(match.id, 'live')"
          >
            <MatchRow :match="match" :live="true" />
          </ULink>
          <ULink
            v-for="match in data.upcoming"
            :key="match.id"
            :to="matchDetailTo(match.id, SOURCE)"
            class="block hover:bg-elevated/50 transition-colors"
            @click="onLiveOrUpcomingClick(match.id, 'upcoming')"
          >
            <MatchRow :match="match" />
          </ULink>
        </div>
      </UiCard>
    </UiRail>
    <UiRail v-if="results && results.results.length > 0" :title="$t('components.match.results')">
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <ULink
            v-for="match in results.results"
            :key="match.id"
            :to="matchDetailTo(match.id, SOURCE)"
            class="block hover:bg-elevated/50 transition-colors"
            @click="onResultClick(match.id)"
          >
            <MatchResultRow :match="match" />
          </ULink>
        </div>
      </UiCard>
    </UiRail>
  </div>
</template>
