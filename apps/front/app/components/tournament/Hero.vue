<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import {
  formatTournamentDateRange,
  getTournamentStatus,
  type TournamentStatus,
} from "~/utils/tournamentStatus";

interface Props {
  tournament: Tournament;
}

const { tournament } = defineProps<Props>();
const { t, locale } = useI18n();

const status = computed(() => getTournamentStatus(tournament));

const dateRange = computed(() =>
  formatTournamentDateRange(tournament.beginAt, tournament.endAt, locale.value),
);

const statusLabel = computed(() => {
  const current: TournamentStatus | null = status.value;
  if (!current) return null;

  switch (current) {
    case "live":
      return t("page.tournaments.id.status.live");
    case "upcoming":
      return t("page.tournaments.id.status.upcoming");
    case "finished":
      return t("page.tournaments.id.status.finished");
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <UiCrossCard class="min-h-14">
    <div class="w-full flex flex-col items-center gap-3 p-4 text-center">
      <p v-if="tournament.league?.name" class="text-sm text-muted text-pretty">
        {{ tournament.league.name }}
      </p>

      <h1 class="text-xl md:text-2xl font-bold tracking-tight text-balance max-w-3xl">
        {{ tournament.name }}
      </h1>

      <div
        v-if="status || dateRange"
        class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted text-pretty"
      >
        <UiBadgeLive v-if="status === 'live'" />
        <span v-else-if="statusLabel">{{ statusLabel }}</span>
        <span v-if="status && dateRange" aria-hidden="true">·</span>
        <span v-if="dateRange" class="tabular-nums">{{ dateRange }}</span>
      </div>
    </div>
  </UiCrossCard>
</template>
