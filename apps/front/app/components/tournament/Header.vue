<script setup lang="ts">
import type { TournamentTab } from "@sarpbc/types";
import { stageMatchesPath, tournamentStagePath } from "@sarpbc/utils";

const { eventSlug, stageSlug, activeTab } = defineProps<{
  eventSlug: string;
  stageSlug: string;
  activeTab: TournamentTab;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const tabItems = computed(() => [
  {
    to: localePath(tournamentStagePath(eventSlug, stageSlug)),
    label: t("common.overview"),
    active: activeTab === "overview",
  },
  {
    to: localePath(stageMatchesPath(eventSlug, stageSlug)),
    label: t("general.matches"),
    active: activeTab === "matches",
  },
]);
</script>

<template>
  <STabNav :items="tabItems" :ariaLabel="t('page.tournaments.id.sections')" />
</template>
