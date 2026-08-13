<script lang="ts" setup>
import type { CareerEventOutcome, CareerStats } from "~/types/career";

const props = defineProps<{
  outcome: CareerEventOutcome;
}>();

const emit = defineEmits<{
  continue: [];
}>();

const { t } = useI18n();

const eventKey = computed(() => `page.game.career.events.${props.outcome.eventId}`);

const outcomeCopy = computed(() => {
  const key = props.outcome.failed ? "failure" : "outcome";
  return t(`${eventKey.value}.choices.${props.outcome.choiceId}.${key}`);
});

const statRows = computed(() => {
  const keys: (keyof CareerStats)[] = ["rating", "form", "morale"];
  return keys
    .map((stat) => ({
      stat,
      value: props.outcome.delta[stat] ?? 0,
    }))
    .filter((row) => row.value !== 0);
});

const deltaGridClass = computed(() => {
  switch (statRows.value.length) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    default:
      return "grid-cols-3";
  }
});

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-2">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t(`${eventKey}.title`) }}
      </h2>
      <p class="text-sm text-muted text-pretty">
        {{ outcomeCopy }}
      </p>
    </div>

    <ul
      v-if="statRows.length > 0"
      class="grid h-[calc(var(--spacing-row-compact)*2)] min-h-[calc(var(--spacing-row-compact)*2)] border border-default divide-x divide-default"
      :class="deltaGridClass"
    >
      <li
        v-for="row in statRows"
        :key="row.stat"
        class="flex flex-col items-center justify-center text-center"
      >
        <p class="text-xs text-muted">{{ t(`page.game.career.stats.${row.stat}`) }}</p>
        <p
          class="text-lg font-semibold tabular-nums"
          :class="row.value > 0 ? 'text-success' : 'text-error'"
        >
          {{ formatDelta(row.value) }}
        </p>
      </li>
    </ul>

    <UButton block @click="emit('continue')">
      {{ t("page.game.career.event.continue") }}
    </UButton>
  </div>
</template>
