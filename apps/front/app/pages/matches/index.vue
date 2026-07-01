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
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ t("page.matches.title") }}
        </h1>
      </div>
    </UiCrossCard>

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
        class="mb-0.25"
      />

      <div v-if="pending" class="w-full pt-11.25 flex flex-col" aria-live="polite">
        <UiCard
          v-for="index in 20"
          :key="index"
          :class="{ 'border-t-0': index > 1, 'h-11.5': index === 1, 'h-11.25': index > 1 }"
        >
          <div v-if="tab === 'past'" class="w-full flex py-1 px-2 items-center">
            <div class="w-full flex flex-col gap-1">
              <div class="w-full grid grid-cols-3 gap-2 items-center">
                <USkeleton class="col-span-2 h-3 max-w-32" />
                <USkeleton class="col-span-1 h-3 w-6 justify-self-end" />
              </div>
              <div class="w-full grid grid-cols-3 gap-2 items-center">
                <USkeleton class="col-span-2 h-3 max-w-28" />
                <USkeleton class="col-span-1 h-3 w-6 justify-self-end" />
              </div>
            </div>
          </div>
          <div v-else class="w-full grid grid-cols-3 py-1 px-2 items-center">
            <div class="col-span-2 flex flex-col gap-0.5">
              <USkeleton class="h-3 w-24" />
              <USkeleton class="h-3 w-28" />
            </div>
            <div class="col-span-1 flex justify-end">
              <USkeleton class="h-3 w-10" />
            </div>
          </div>
        </UiCard>
      </div>

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
          class="mb-4"
        />

        <template v-if="tab === 'upcoming'">
          <MatchListGroup
            v-if="upcomingMatches.length > 0"
            :matches="upcomingMatches"
            variant="upcoming"
            :title="t('page.matches.sections.upcoming')"
          />
        </template>

        <MatchListGroup
          v-else-if="pastMatches.length > 0"
          :matches="pastMatches"
          variant="result"
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
