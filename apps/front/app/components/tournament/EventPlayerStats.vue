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
  { label: t("page.tournaments.stats.allStages"), value: ALL_STAGES },
  ...stages.map(({ id, name }) => ({ label: name, value: id })),
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
    default: () => null,
    watch: [stage],
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
