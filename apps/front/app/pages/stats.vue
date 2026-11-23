<script lang="ts" setup>
import { OVERALL_STATS_MIN_GAMES } from "@sarpbc/types";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  data: stats,
  pending,
  error,
  refresh,
} = await useAsyncData("player-stats-leaderboard", () => getPlayerStatsLeaderboard(), {
  default: () => null,
});

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
      overall
      @retry="refresh()"
    />
  </div>
</template>
