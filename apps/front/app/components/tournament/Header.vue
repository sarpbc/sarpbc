<script setup lang="ts">
import type { TournamentTab } from "@sarpbc/types";
import { tournamentTabPath } from "~/utils/tournament-tab-route";

const { eventSlug, stageSlug, activeTab, stats } = defineProps<{
  eventSlug: string;
  stageSlug: string;
  activeTab: TournamentTab;
  stats: boolean;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const TABS = [
  { label: "common.overview", tab: "overview" },
  { label: "general.matches", tab: "matches" },
  { label: "page.tournaments.stats.tab", tab: "stats" },
] as const;

const tabItems = computed(() =>
  TABS.flatMap(({ tab, label }) =>
    stats || tab !== "stats"
      ? [
          {
            active: activeTab === tab,
            label: t(label),
            to: localePath(tournamentTabPath(tab, eventSlug, stageSlug)),
          },
        ]
      : [],
  ),
);
</script>

<template>
  <STabNav :items="tabItems" :ariaLabel="t('page.tournaments.id.sections')" />
</template>
