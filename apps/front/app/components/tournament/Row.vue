<script lang="ts" setup>
import type { TournamentListItem } from "@sarpbc/types";
import { formatTournamentShortDateRange } from "~/utils/tournament-status";

const { tournament, to } = defineProps<{
  tournament: TournamentListItem;
  to: string;
}>();

const { t, locale } = useI18n();

const dateLabel = computed(() =>
  formatTournamentShortDateRange(tournament.beginAt, tournament.endAt, locale.value),
);

const formatLabel = computed(() => nonDefaultFormatLabel(tournament.format));

const teamCount = computed(() => tournament.participants?.length ?? 0);
</script>

<template>
  <SListItem :to="to" class="min-w-0 gap-3">
    <h3 class="min-w-0 flex-1 truncate text-sm text-default group-hover:text-highlighted">
      {{ tournament.name }}
    </h3>
    <span v-if="formatLabel" class="shrink-0 text-xs text-muted tabular-nums">
      {{ formatLabel }}
    </span>
    <span class="w-24 shrink-0 truncate text-xs text-muted tabular-nums sm:w-32">
      {{ dateLabel }}
    </span>
    <span class="w-20 shrink-0 truncate text-end text-xs text-muted tabular-nums">
      <template v-if="teamCount > 0">
        {{ t(participantsCountKey(tournament.format), { count: teamCount }) }}
      </template>
    </span>
  </SListItem>
</template>
