<script lang="ts" setup>
import type { CareerPlacement, CareerSplitRecord, CareerStage } from "~/types/career";

const props = defineProps<{
  stage: CareerStage;
  split: CareerSplitRecord | null;
  worldsPlacement: CareerPlacement | null;
  seasonPoints: number;
  qualifiedForWorlds: boolean;
}>();

const emit = defineEmits<{
  continue: [];
}>();

const { t } = useI18n();

const isWorlds = computed(() => props.stage === "worlds");
const showQualificationBanner = computed(() => props.stage === "split2");
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-1 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{
          isWorlds
            ? t("page.game.career.results.worldsTitle")
            : t("page.game.career.results.splitTitle", { split: split?.split ?? 1 })
        }}
      </h2>
      <p class="text-sm text-muted">
        {{ t("page.game.career.results.seasonPoints", { points: seasonPoints }) }}
      </p>
    </div>

    <template v-if="!isWorlds && split">
      <ul class="flex flex-col gap-2">
        <li
          v-for="(placement, index) in split.regionals"
          :key="index"
          class="flex items-center justify-between border border-default p-3 text-sm"
        >
          <span class="font-medium">
            {{ t("page.game.career.results.regional", { index: index + 1 }) }}
          </span>
          <span>{{ t(`page.game.career.placements.${placement}`) }}</span>
        </li>
        <li
          class="flex items-center justify-between border border-default p-3 text-sm"
          :class="split.major ? 'bg-elevated' : ''"
        >
          <span class="font-semibold">
            {{ t("page.game.career.results.major", { split: split.split }) }}
          </span>
          <span v-if="split.major">{{ t(`page.game.career.placements.${split.major}`) }}</span>
          <span v-else class="text-muted">
            {{ t("page.game.career.results.majorNotQualified") }}
          </span>
        </li>
      </ul>

      <div
        v-if="showQualificationBanner"
        class="border p-3 text-center text-sm font-medium"
        :class="qualifiedForWorlds ? 'border-primary text-primary' : 'border-default text-muted'"
      >
        {{
          qualifiedForWorlds
            ? t("page.game.career.results.worldsQualified")
            : t("page.game.career.results.worldsMissed")
        }}
      </div>
    </template>

    <div v-else-if="isWorlds && worldsPlacement" class="border border-default p-6 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.results.worldsPlacementLabel") }}</p>
      <p class="mt-1 text-2xl font-bold tracking-tight">
        {{ t(`page.game.career.placements.${worldsPlacement}`) }}
      </p>
    </div>

    <UButton block @click="emit('continue')">
      {{ t("page.game.career.results.continue") }}
    </UButton>
  </div>
</template>
