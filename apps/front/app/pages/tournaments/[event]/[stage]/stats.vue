<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";

const { tournament } = defineProps<{
  tournament: Tournament;
}>();

const tournamentId = computed(() => tournament.id);

const {
  data: stats,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `tournament-player-stats-${tournamentId.value}`,
  () => getTournamentPlayerStats(tournamentId.value),
  {
    default: () => null,
    watch: [tournamentId],
  },
);
</script>

<template>
  <TournamentPlayerStats
    :stats="stats"
    :pending="pending"
    :error="Boolean(error)"
    @retry="refresh()"
  />
</template>
