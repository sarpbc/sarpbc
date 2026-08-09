<script setup lang="ts">
interface Props {
  tournamentId: string;
  activeTab: "overview" | "matches" | "teams";
}

const { tournamentId, activeTab } = defineProps<Props>();
</script>

<template>
  <div class="w-full flex flex-row gap-2">
    <UButton
      :to="$localePath(`/tournaments/${tournamentId}`)"
      :label="$t('common.overview')"
      :variant="activeTab === 'overview' ? 'solid' : 'soft'"
      color="neutral"
      class="w-full items-center justify-center"
    />
    <UButton
      :to="$localePath(`/tournaments/${tournamentId}/matches`)"
      :label="$t('general.matches')"
      :variant="activeTab === 'matches' ? 'solid' : 'soft'"
      color="neutral"
      class="w-full items-center justify-center"
    />
    <UButton
      :to="$localePath(`/tournaments/${tournamentId}/teams`)"
      :label="$t('general.teams')"
      :variant="activeTab === 'teams' ? 'solid' : 'soft'"
      color="neutral"
      class="w-full items-center justify-center"
    />
  </div>
</template>
