<script setup lang="ts">
const { tournamentId, activeTab } = defineProps<{
  tournamentId: string;
  activeTab: "overview" | "matches";
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const tabItems = computed(() => [
  {
    to: localePath(`/tournaments/${tournamentId}`),
    label: t("common.overview"),
    active: activeTab === "overview",
  },
  {
    to: localePath(`/tournaments/${tournamentId}/matches`),
    label: t("general.matches"),
    active: activeTab === "matches",
  },
]);
</script>

<template>
  <STabNav :items="tabItems" :aria-label="t('page.tournaments.id.sections')" />
</template>
