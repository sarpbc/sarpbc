<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  tab,
  offset,
  hasActiveFilters,
  tournamentFilterOptions,
  selectedTournamentFilterValue,
  pending,
  error,
  refresh,
  liveMatches,
  upcomingMatches,
  pastMatches,
  totalMatches,
  hasMatches,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  tabItems,
  getTabQuery,
  getPageQuery,
  onTournamentFilterChange,
  clearFilters,
} = useMatchesListPage();

setPageSeo({
  title: t("page.matches.seo.title"),
  description: t("page.matches.seo.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiHubPageHeader>
      <template #title>{{ t("page.matches.title") }}</template>
      <template v-if="liveMatches.length > 0" #meta>
        <UiBadgeLive />
        <span>{{ t("page.hub.headers.matchesLive", { count: liveMatches.length }) }}</span>
      </template>
    </UiHubPageHeader>

    <div>
      <MatchListToolbar
        :tab="tab"
        :tab-items="tabItems"
        :get-tab-query="getTabQuery"
        :tournament-filter-options="tournamentFilterOptions"
        :selected-tournament-filter-value="selectedTournamentFilterValue"
        :has-active-filters="hasActiveFilters"
        @tournament-change="onTournamentFilterChange"
        @clear="clearFilters"
      />

      <UiCard v-if="pending" flush-bottom class="flex flex-col" aria-live="polite">
        <UiListItem
          v-for="index in 20"
          :key="index"
          size="default"
          divider
          :class="tab === 'past' ? 'min-w-0' : undefined"
        >
          <div
            v-if="tab === 'past'"
            class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          >
            <USkeleton class="h-3 max-w-32" />
            <USkeleton class="h-3 w-4 justify-self-end" />
            <USkeleton class="h-3 max-w-28" />
            <USkeleton class="h-3 w-4 justify-self-end" />
          </div>
          <div v-else class="grid w-full grid-cols-3 items-center">
            <div class="col-span-2 flex flex-col gap-0.5">
              <USkeleton class="h-3 w-24" />
              <USkeleton class="h-3 w-28" />
            </div>
            <div class="col-span-1 flex justify-end">
              <USkeleton class="h-3 w-10" />
            </div>
          </div>
        </UiListItem>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex flex-col items-center h-67.25 gap-3 justify-center">
          <UIcon name="i-fluent-warning-24-regular" class="text-4xl text-muted" />
          <p class="text-sm text-muted">
            {{ t("page.matches.error") }}
          </p>
          <UButton variant="outline" @click="refresh()" color="error">
            {{ t("page.matches.retry") }}
          </UButton>
        </div>
      </UiCard>

      <template v-else-if="hasMatches">
        <MatchListGroup
          v-if="liveMatches.length > 0"
          :matches="liveMatches"
          variant="live"
          :title="t('page.matches.sections.live')"
          discovery-source="matches_list"
          class="mb-4"
        />

        <template v-if="tab === 'upcoming'">
          <MatchListGroup
            v-if="upcomingMatches.length > 0"
            :matches="upcomingMatches"
            variant="upcoming"
            discovery-source="matches_list"
          />
        </template>

        <MatchListGroup
          v-else-if="pastMatches.length > 0"
          :matches="pastMatches"
          variant="result"
          discovery-source="matches_list"
        />

        <MatchListPagination
          v-if="totalMatches > MATCHES_PER_PAGE"
          :current-page="currentPage"
          :total-pages="totalPages"
          :has-previous="hasPrevious"
          :has-next="hasNext"
          :get-page-query="getPageQuery"
          :offset="offset"
          :page-size="MATCHES_PER_PAGE"
          class="mt-11"
        />
      </template>

      <MatchListEmpty
        v-else
        :tab="tab"
        :has-active-filters="hasActiveFilters"
        :get-tab-query="getTabQuery"
        @clear="clearFilters"
      />
    </div>
  </div>
</template>
