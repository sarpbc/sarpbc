<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import { formatTournamentShortDateRange } from "~/utils/tournamentStatus";

const { tournament, to } = defineProps<{
  tournament: Tournament;
  to: string;
}>();

const { t, locale } = useI18n();

const dateLabel = computed(() =>
  formatTournamentShortDateRange(tournament.beginAt, tournament.endAt, locale.value),
);

const teamCount = computed(() => tournament.participants?.length ?? 0);
</script>

<template>
  <SListItem divider :to="to" class="min-w-0 gap-3">
    <h3 class="min-w-0 flex-1 truncate text-sm font-medium text-default">
      {{ tournament.name }}
    </h3>
    <span class="w-24 shrink-0 truncate text-xs text-muted tabular-nums sm:w-32">
      {{ dateLabel }}
    </span>
    <span class="w-20 shrink-0 truncate text-end text-xs text-muted tabular-nums">
      <template v-if="teamCount > 0">
        {{ t("page.tournaments.id.hero.teamsCount", { count: teamCount }) }}
      </template>
    </span>
  </SListItem>
</template>
