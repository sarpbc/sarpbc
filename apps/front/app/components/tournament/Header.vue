<script setup lang="ts">
import type { TournamentTab } from "~/types/tournament";

const { stagePath, activeTab } = defineProps<{
  stagePath: string;
  activeTab: TournamentTab;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const tabItems = computed(() => [
  {
    to: localePath(stagePath),
    label: t("common.overview"),
    active: activeTab === "overview",
  },
  {
    to: localePath(`${stagePath}/matches`),
    label: t("general.matches"),
    active: activeTab === "matches",
  },
]);
</script>

<template>
  <STabNav :items="tabItems" :ariaLabel="t('page.tournaments.id.sections')" />
</template>
