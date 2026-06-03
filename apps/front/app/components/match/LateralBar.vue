<script lang="ts" setup>
const { data, refresh: refreshUpcomingMatches } = await useLazyAsyncData(`upcoming-matches`, () =>
  getUpcomingMatches(),
);
const { data: results, refresh: refreshResults } = await useLazyAsyncData(`matches-results`, () =>
  getMatchesResults(),
);

const route = useRoute();
watch(
  () => route.path,
  () => {
    refreshUpcomingMatches();
    refreshResults();
  },
);
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
          <MatchRow
            v-for="(match, index) in data.live"
            :key="match.id"
            :match="match"
            :live="true"
            :last="index === data.live.length - 1 && data.upcoming.length === 0"
          />
          <MatchRow
            v-for="(match, index) in data.upcoming"
            :key="match.id"
            :match="match"
            :last="index === data.upcoming.length - 1"
          />
        </div>
      </UiCard>
    </div>
    <div v-if="results && results.length > 0" class="w-full flex flex-col">
      <div class="flex flex-col-reverse text-sm font-medium text-toned h-10 pl-2 pb-1">
        {{ $t("components.match.results") }}
      </div>
      <UiCard>
        <div class="w-full flex flex-col">
          <MatchResultRow
            v-for="(match, index) in results"
            :key="match.id"
            :match="match"
            :last="index === results.length - 1"
          />
        </div>
      </UiCard>
    </div>
  </div>
</template>
