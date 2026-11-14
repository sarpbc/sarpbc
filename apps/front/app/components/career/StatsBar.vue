<script lang="ts" setup>
import type { CareerStats } from "~/types/career";

const { stats, age } = defineProps<{
  stats: CareerStats;
  age: number;
}>();

const { t } = useI18n();

const cells = computed(
  () =>
    [
      { key: "age", value: age },
      { key: "rating", value: stats.rating },
      { key: "form", value: stats.form },
      { key: "morale", value: stats.morale },
    ] as const,
);
</script>

<template>
  <div
    class="grid h-[calc(var(--spacing-row-compact)*2)] min-h-[calc(var(--spacing-row-compact)*2)] grid-cols-4 border border-separator divide-x divide-separator"
  >
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="flex flex-col items-center justify-center text-center"
    >
      <p class="text-xs text-muted">{{ t(`page.game.career.stats.${cell.key}`) }}</p>
      <p class="text-lg font-medium tabular-nums">{{ cell.value }}</p>
    </div>
  </div>
</template>
