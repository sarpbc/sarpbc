<script lang="ts" setup>
import type { CareerPlacement, CareerRegion, CareerSplitRecord, CareerStage } from "~/types/career";
import { MAJOR_POINTS, REGIONAL_POINTS, regionalCircuitWeight } from "~/utils/career/simulation";

const { stage, split, worldsPlacement, seasonPoints, qualifiedForWorlds, region } = defineProps<{
  stage: CareerStage;
  split: CareerSplitRecord | null;
  worldsPlacement: CareerPlacement | null;
  seasonPoints: number;
  qualifiedForWorlds: boolean;
  region: CareerRegion | null;
}>();

const emit = defineEmits<{
  continue: [];
}>();

const { t } = useI18n();

const isWorlds = computed(() => stage === "worlds");
const showQualificationBanner = computed(() => !isWorlds.value && stage === "split2");

const showResultsRail = computed(
  () => (!isWorlds.value && split !== null) || (isWorlds.value && worldsPlacement !== null),
);

const railTitle = computed(() =>
  isWorlds.value
    ? t("page.game.career.results.worldsTitle")
    : t("page.game.career.results.splitTitle", { split: split?.split ?? 1 }),
);

const regionalPlacementPoints = (placement: CareerPlacement): number => {
  const weight = region ? regionalCircuitWeight(region) : 1;

  return Math.round(REGIONAL_POINTS[placement] * weight);
};

const majorPlacementPoints = (placement: CareerPlacement | null): number => {
  if (!placement) {
    return 0;
  }

  return MAJOR_POINTS[placement];
};

const pointsTooltip = (points: number): string => {
  const shown = points > 0 ? `+${points}` : `${points}`;

  return t("page.game.career.results.points", { points: shown });
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-center text-sm text-muted">
      {{ t("page.game.career.results.seasonPoints", { points: seasonPoints }) }}
    </p>

    <HubRail v-if="showResultsRail" caption="lead" :title="railTitle">
      <HubCard>
        <ul v-if="!isWorlds && split" class="flex flex-col">
          <li
            v-for="(placement, index) in split.regionals"
            :key="index"
            class="border-b border-separator px-2 py-1.5 text-sm"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t("page.game.career.results.regional", { index: index + 1 }) }}
              </p>
              <STooltip :text="pointsTooltip(regionalPlacementPoints(placement))">
                <p class="shrink-0 text-right">
                  {{ t(`page.game.career.placements.${placement}`) }}
                </p>
              </STooltip>
            </div>
          </li>
          <li
            class="border-b border-separator px-2 py-1.5 text-sm"
            :class="split.major ? 'bg-elevated' : undefined"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t("page.game.career.results.major", { split: split.split }) }}
              </p>
              <STooltip v-if="split.major" :text="pointsTooltip(majorPlacementPoints(split.major))">
                <p class="shrink-0 text-right">
                  {{ t(`page.game.career.placements.${split.major}`) }}
                </p>
              </STooltip>
              <STooltip v-else :text="pointsTooltip(0)">
                <p class="shrink-0 text-right text-muted">
                  {{ t("page.game.career.results.majorNotQualified") }}
                </p>
              </STooltip>
            </div>
          </li>
        </ul>
        <ul v-else-if="isWorlds && worldsPlacement" class="flex flex-col">
          <li class="border-b border-separator px-2 py-1.5 text-sm">
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t("page.game.career.results.worldsPlacementLabel") }}
              </p>
              <p class="shrink-0 text-right">
                {{ t(`page.game.career.placements.${worldsPlacement}`) }}
              </p>
            </div>
          </li>
        </ul>
      </HubCard>
    </HubRail>

    <div
      v-if="showQualificationBanner"
      class="border p-3 text-center text-sm font-medium"
      :class="qualifiedForWorlds ? 'border-primary text-primary' : 'border-separator text-muted'"
    >
      {{
        qualifiedForWorlds
          ? t("page.game.career.results.worldsQualified")
          : t("page.game.career.results.worldsMissed")
      }}
    </div>

    <SButton block @click="emit('continue')">
      {{ t("page.game.career.results.continue") }}
    </SButton>
  </div>
</template>
