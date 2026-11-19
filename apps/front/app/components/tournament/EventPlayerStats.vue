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
    :caption="$t('page.tournaments.stats.caption')"
    :empty-title="$t('page.tournaments.stats.empty')"
    @retry="refresh()"
  >
    <template v-if="stages.length > 1" #filters>
      <SSelect
        v-model="stage"
        :items="stageOptions"
        :aria-label="t('page.tournaments.stats.stage')"
        class="w-48"
      />
    </template>
  </TournamentPlayerStats>
</template>
