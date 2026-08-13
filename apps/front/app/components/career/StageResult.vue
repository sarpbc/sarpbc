<script lang="ts" setup>
import type { CareerPlacement, CareerRegion, CareerSplitRecord, CareerStage } from "~/types/career";
import { MAJOR_POINTS, REGIONAL_POINTS, regionalCircuitWeight } from "~/utils/career/simulation";

const props = defineProps<{
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

const isWorlds = computed(() => props.stage === "worlds");
const showQualificationBanner = computed(() => !isWorlds.value && props.stage === "split2");
const showResultsRail = computed(
  () =>
    (!isWorlds.value && props.split !== null) || (isWorlds.value && props.worldsPlacement !== null),
);
const railTitle = computed(() =>
  isWorlds.value
    ? t("page.game.career.results.worldsTitle")
    : t("page.game.career.results.splitTitle", { split: props.split?.split ?? 1 }),
);

const tooltipContent = {
  align: "center" as const,
  side: "top" as const,
  sideOffset: 4,
};

function regionalPlacementPoints(placement: CareerPlacement): number {
  const weight = props.region ? regionalCircuitWeight(props.region) : 1;
  return Math.round(REGIONAL_POINTS[placement] * weight);
}

function majorPlacementPoints(placement: CareerPlacement | null): number {
  if (!placement) return 0;
  return MAJOR_POINTS[placement];
}

function pointsTooltip(points: number): string {
  const shown = points > 0 ? `+${points}` : `${points}`;
  return t("page.game.career.results.points", { points: shown });
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-center text-sm text-muted">
      {{ t("page.game.career.results.seasonPoints", { points: seasonPoints }) }}
    </p>

    <SRail v-if="showResultsRail" caption="lead" :title="railTitle">
      <SCard flush-bottom>
        <ul v-if="!isWorlds && split" class="flex flex-col">
          <li
            v-for="(placement, index) in split.regionals"
            :key="index"
            class="border-b border-default px-2 py-1.5 text-sm"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t("page.game.career.results.regional", { index: index + 1 }) }}
              </p>
              <UTooltip
                :text="pointsTooltip(regionalPlacementPoints(placement))"
                :content="tooltipContent"
              >
                <p class="shrink-0 text-right">
                  {{ t(`page.game.career.placements.${placement}`) }}
                </p>
              </UTooltip>
            </div>
          </li>
          <li
            class="border-b border-default px-2 py-1.5 text-sm"
            :class="split.major ? 'bg-elevated' : undefined"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-semibold">
                {{ t("page.game.career.results.major", { split: split.split }) }}
              </p>
              <UTooltip
                v-if="split.major"
                :text="pointsTooltip(majorPlacementPoints(split.major))"
                :content="tooltipContent"
              >
                <p class="shrink-0 text-right">
                  {{ t(`page.game.career.placements.${split.major}`) }}
                </p>
              </UTooltip>
              <UTooltip v-else :text="pointsTooltip(0)" :content="tooltipContent">
                <p class="shrink-0 text-right text-muted">
                  {{ t("page.game.career.results.majorNotQualified") }}
                </p>
              </UTooltip>
            </div>
          </li>
        </ul>
        <ul v-else-if="isWorlds && worldsPlacement" class="flex flex-col">
          <li class="border-b border-default px-2 py-1.5 text-sm">
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
      </SCard>
    </SRail>

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

    <UButton block @click="emit('continue')">
      {{ t("page.game.career.results.continue") }}
    </UButton>
  </div>
</template>
