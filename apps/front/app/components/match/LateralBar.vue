<script lang="ts" setup>
const { data } = await useLazyAsyncData(`upcoming-matches`, () => getUpcomingMatches(), {
  getCachedData(key, nuxtApp) {
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});
const { data: results } = await useLazyAsyncData(`matches-results`, () => getMatchesResults(), {
  getCachedData(key, nuxtApp) {
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});
</script>

<template>
  <div class="w-full flex flex-col pt-8">
    <div
      v-if="data && (data.live.length > 0 || data.upcoming.length > 0)"
      class="w-full flex flex-col"
    >
      <div class="flex flex-col-reverse text-sm font-medium text-toned h-10 pl-2 pb-1">
        {{ $t("components.match.todaysMatch") }}
      </div>
      <UiCard>
        <div class="w-full flex flex-col">
          <ULink
            v-for="(match, index) in data.live"
            :key="match.id"
            :to="$localePath(`/matches/${match.id}`)"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchRow
              :match="match"
              :live="true"
              :last="index === data.live.length - 1 && data.upcoming.length === 0"
            />
          </ULink>
          <ULink
            v-for="(match, index) in data.upcoming"
            :key="match.id"
            :to="$localePath(`/matches/${match.id}`)"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchRow :match="match" :last="index === data.upcoming.length - 1" />
          </ULink>
        </div>
      </UiCard>
    </div>
    <div v-if="results && results.results.length > 0" class="w-full flex flex-col">
      <div class="flex flex-col-reverse text-sm font-medium text-toned h-10 pl-2 pb-1">
        {{ $t("components.match.results") }}
      </div>
      <UiCard>
        <div class="w-full flex flex-col">
          <ULink
            v-for="(match, index) in results.results"
            :key="match.id"
            :to="$localePath(`/matches/${match.id}`)"
            class="block hover:bg-elevated/50 transition-colors"
          >
            <MatchResultRow :match="match" :last="index === results.results.length - 1" />
          </ULink>
        </div>
      </UiCard>
    </div>
  </div>
</template>
