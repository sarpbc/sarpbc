<script setup lang="ts">
import type { TournamentTab } from "@sarpbc/types";
import { tournamentTabPath } from "~/utils/tournamentTabRoute";

const { eventSlug, stageSlug, activeTab, stats } = defineProps<{
  eventSlug: string;
  stageSlug: string;
  activeTab: TournamentTab;
  stats: boolean;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const TABS = [
  { tab: "overview", label: "common.overview" },
  { tab: "matches", label: "general.matches" },
  { tab: "stats", label: "page.tournaments.stats.tab" },
] as const;

const tabItems = computed(() =>
  TABS.flatMap(({ tab, label }) =>
    stats || tab !== "stats"
      ? [
          {
            to: localePath(tournamentTabPath(tab, eventSlug, stageSlug)),
            label: t(label),
            active: activeTab === tab,
          },
        ]
      : [],
  ),
);
</script>

<template>
  <STabNav :items="tabItems" :ariaLabel="t('page.tournaments.id.sections')" />
</template>
