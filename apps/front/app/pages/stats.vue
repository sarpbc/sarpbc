<script lang="ts" setup>
import { OPEN_ERA_START, OVERALL_STATS_MIN_GAMES, STATS_ERAS } from "@sarpbc/types";
import type { StatsEra } from "@sarpbc/types";

const { t, locale } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const ALL_ERAS = "all";

const isEra = (value: string): value is StatsEra => STATS_ERAS.some((era) => era === value);

const era = computed(() => {
  const value = routeQueryString(route.query.era);

  return isEra(value) ? value : null;
});

const openEraStart = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: "long", timeZone: "UTC", year: "numeric" }).format(
    new Date(OPEN_ERA_START),
  ),
);

const eraOptions = computed(() => [
  { label: t("page.stats.era.all"), value: ALL_ERAS },
  { label: t("page.stats.era.open"), value: "open" },
  { label: t("page.stats.era.preOpen"), value: "pre-open" },
]);

const setEra = async (value: string) => {
  await navigateTo(
    { query: { ...route.query, era: isEra(value) ? value : undefined } },
    { replace: true },
  );
};

const {
  data: stats,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `player-stats-leaderboard-${era.value ?? ALL_ERAS}`,
  () => getPlayerStatsLeaderboard(era.value),
  { default: () => null },
);

setPageSeo({
  description: t("page.stats.seo.description"),
  title: t("page.stats.seo.title"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t("page.stats.title") }}</template>
      <template v-if="stats && stats.games > 0" #meta>
        <span>{{ t("page.stats.games", { count: stats.games }) }}</span>
        <span>{{ t("page.stats.minGames", { count: OVERALL_STATS_MIN_GAMES }) }}</span>
      </template>
    </HubPageHeader>

    <TournamentPlayerStats
      :stats="stats"
      :pending="pending"
      :error="Boolean(error)"
      :caption="t('page.stats.caption')"
      :empty-title="t('page.stats.empty')"
      @retry="refresh()"
    >
      <template #filters>
        <STabs
          :model-value="era ?? ALL_ERAS"
          :items="eraOptions"
          :ariaLabel="t('page.stats.era.label')"
          @update:model-value="setEra"
        />
        <span v-if="era" class="text-xs text-muted">
          {{
            t(era === "open" ? "page.stats.era.openSince" : "page.stats.era.preOpenUntil", {
              date: openEraStart,
            })
          }}
        </span>
      </template>
    </TournamentPlayerStats>
  </div>
</template>
