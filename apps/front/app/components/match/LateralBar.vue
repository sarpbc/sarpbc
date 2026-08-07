<script lang="ts" setup>
const { data } = await useUpcomingMatches();
const { data: results } = await useLazyAsyncData(`matches-results`, () => getMatchesResults(), {
  getCachedData(key, nuxtApp) {
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const SOURCE = "lateral_bar" as const;
</script>

<template>
  <div class="w-full flex flex-col">
    <UiRail
      v-if="data && (data.live.length > 0 || data.upcoming.length > 0)"
      :title="$t('components.match.todaysMatch')"
    >
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="match in data.live"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="live"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchRow :match="match" :live="true" />
          </MatchDiscoveryLink>
          <MatchDiscoveryLink
            v-for="match in data.upcoming"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="upcoming"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchRow :match="match" />
          </MatchDiscoveryLink>
        </div>
      </UiCard>
    </UiRail>
    <UiRail v-if="results && results.results.length > 0" :title="$t('components.match.results')">
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <MatchDiscoveryLink
            v-for="match in results.results"
            :key="match.id"
            :match-id="match.id"
            :source="SOURCE"
            status="finished"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchResultRow :match="match" />
          </MatchDiscoveryLink>
        </div>
      </UiCard>
    </UiRail>
  </div>
</template>
