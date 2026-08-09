<script lang="ts" setup>
import type { CareerStats } from "~/types/career";

defineProps<{
  stats: CareerStats;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="grid grid-cols-3 gap-2 sm:gap-4">
    <div class="border border-default p-3 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.stats.rating") }}</p>
      <p class="text-lg font-semibold tabular-nums">{{ stats.rating }}</p>
    </div>
    <div class="border border-default p-3 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.stats.form") }}</p>
      <p class="text-lg font-semibold tabular-nums">{{ stats.form }}</p>
    </div>
    <div class="border border-default p-3 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.stats.morale") }}</p>
      <p class="text-lg font-semibold tabular-nums">{{ stats.morale }}</p>
    </div>
  </div>
</template>
