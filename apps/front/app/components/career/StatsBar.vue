<script lang="ts" setup>
import type { CareerStats } from "~/types/career";

const props = defineProps<{
  stats: CareerStats;
  age: number;
}>();

const { t } = useI18n();

const cells = computed(
  () =>
    [
      { key: "age", value: props.age },
      { key: "rating", value: props.stats.rating },
      { key: "form", value: props.stats.form },
      { key: "morale", value: props.stats.morale },
    ] as const,
);
</script>

<template>
  <div
    class="grid h-[calc(var(--spacing-row-compact)*2)] min-h-[calc(var(--spacing-row-compact)*2)] grid-cols-4 border border-default divide-x divide-default"
  >
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="flex flex-col items-center justify-center text-center"
    >
      <p class="text-xs text-muted">{{ t(`page.game.career.stats.${cell.key}`) }}</p>
      <p class="text-lg font-semibold tabular-nums">{{ cell.value }}</p>
    </div>
  </div>
</template>
