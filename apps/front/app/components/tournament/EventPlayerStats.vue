<script lang="ts" setup>
import type { TournamentDetail } from "@sarpbc/types";

const { eventSlug, stages } = defineProps<{
  eventSlug: string;
  stages: TournamentDetail[];
}>();

const { t } = useI18n();

const ALL_STAGES = "all";
const stage = ref(ALL_STAGES);

const stageOptions = computed(() => [
  { value: ALL_STAGES, label: t("page.tournaments.stats.allStages") },
  ...stages.map(({ id, name }) => ({ value: id, label: name })),
]);

const {
  data: stats,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `event-player-stats-${eventSlug}-${stage.value}`,
  () =>
    stage.value === ALL_STAGES
      ? getEventPlayerStats(eventSlug)
      : getTournamentPlayerStats(stage.value),
  {
    watch: [stage],
    default: () => null,
  },
);
</script>

<template>
  <TournamentPlayerStats
    :stats="stats"
    :pending="pending"
    :error="Boolean(error)"
    @retry="refresh()"
  >
    <template v-if="stages.length > 1" #filters>
      <USelect
        v-model="stage"
        :items="stageOptions"
        value-key="value"
        label-key="label"
        :aria-label="t('page.tournaments.stats.stage')"
        class="w-48"
      />
    </template>
  </TournamentPlayerStats>
</template>
