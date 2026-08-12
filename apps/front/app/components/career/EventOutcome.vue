<script lang="ts" setup>
import type { CareerEventOutcome, CareerStats } from "~/types/career";
import { primaryDestinyLean } from "~/types/career";

const props = defineProps<{
  outcome: CareerEventOutcome;
}>();

const emit = defineEmits<{
  continue: [];
}>();

const { t } = useI18n();

const eventKey = computed(() => `page.game.career.events.${props.outcome.eventId}`);

const destinyLean = computed(() => primaryDestinyLean(props.outcome.destiny));

const statRows = computed(() => {
  const keys: (keyof CareerStats)[] = ["rating", "form", "morale"];
  return keys
    .map((stat) => ({
      stat,
      value: props.outcome.delta[stat] ?? 0,
    }))
    .filter((row) => row.value !== 0);
});

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-2 text-center">
      <p class="text-xs font-semibold text-muted">
        {{ t("page.game.career.event.outcomeLabel") }}
      </p>
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t(`${eventKey}.title`) }}
      </h2>
      <p class="text-sm font-medium">
        {{ t(`${eventKey}.choices.${outcome.choiceId}.label`) }}
      </p>
      <p class="text-sm text-muted text-pretty">
        {{ t(`${eventKey}.choices.${outcome.choiceId}.outcome`) }}
      </p>
    </div>

    <ul v-if="statRows.length > 0" class="grid grid-cols-3 gap-2">
      <li v-for="row in statRows" :key="row.stat" class="border border-default p-3 text-center">
        <p class="text-xs text-muted">{{ t(`page.game.career.stats.${row.stat}`) }}</p>
        <p
          class="text-lg font-semibold tabular-nums"
          :class="row.value > 0 ? 'text-success' : 'text-error'"
        >
          {{ formatDelta(row.value) }}
        </p>
      </li>
    </ul>

    <p v-if="destinyLean" class="text-center text-xs text-muted">
      {{
        t("page.game.career.event.destinyLean", {
          path: t(`page.game.career.destiny.${destinyLean}.label`),
        })
      }}
    </p>

    <UButton block @click="emit('continue')">
      {{ t("page.game.career.event.continue") }}
    </UButton>
  </div>
</template>
