<script lang="ts" setup>
import type { CareerMatchResult } from "~/types/career";

defineProps<{
  matches: CareerMatchResult[];
  placementKey: string;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-1 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t("page.game.career.match.title") }}
      </h2>
      <p class="text-sm text-muted">{{ t("page.game.career.match.subtitle") }}</p>
    </div>

    <div class="border border-default p-4 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.end.palmarès") }}</p>
      <p class="text-base font-semibold">{{ t(placementKey) }}</p>
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(match, index) in matches"
        :key="index"
        class="flex items-center justify-between border border-default p-3 text-sm"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ t(match.stage) }}</p>
          <p class="text-muted">vs {{ match.opponent }}</p>
        </div>
        <div class="flex items-center gap-2 tabular-nums">
          <span class="font-semibold"> {{ match.scoreFor }}–{{ match.scoreAgainst }} </span>
          <UBadge :color="match.won ? 'success' : 'error'" variant="soft">
            {{ match.won ? t("page.game.career.match.won") : t("page.game.career.match.lost") }}
          </UBadge>
        </div>
      </li>
    </ul>
  </div>
</template>
