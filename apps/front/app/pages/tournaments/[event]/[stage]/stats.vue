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
    :caption="$t('page.tournaments.stats.caption')"
    :empty-title="$t('page.tournaments.stats.empty')"
    team-filter
    @retry="refresh()"
  />
</template>
