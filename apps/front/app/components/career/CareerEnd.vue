<script lang="ts" setup>
import type { CareerResult, CareerSeasonRecord } from "~/types/career";

const props = defineProps<{
  result: CareerResult;
  shared?: boolean;
}>();

const emit = defineEmits<{
  playAgain: [];
  share: [];
}>();

const { t } = useI18n();
const toast = useToast();

function onShare() {
  emit("share");
  toast.add({ title: t("page.game.career.end.shareCopied") });
}

const trophyCounts = computed(() => {
  const counts = { regional: 0, major: 0, worlds: 0 };
  for (const trophy of props.result.trophies) {
    counts[trophy.type] += 1;
  }
  return counts;
});

const hasTrophies = computed(() => props.result.trophies.length > 0);

function majorSummary(season: CareerSeasonRecord, split: number): string {
  const record = season.splits.find((entry) => entry.split === split);
  if (!record) return t("page.game.career.results.majorNotQualified");
  return record.major
    ? t(`page.game.career.placements.${record.major}`)
    : t("page.game.career.results.majorNotQualified");
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-2 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ shared ? t("page.game.career.end.viewShared") : t("page.game.career.end.title") }}
      </h2>
      <p class="text-xl font-bold tracking-tight">{{ result.playerName }}</p>
      <p class="text-sm text-muted">
        {{ t(`page.game.career.destiny.${result.destiny}.endLine`) }}
      </p>
      <p class="text-sm text-muted">
        {{
          t("page.game.career.end.retiredAt", {
            age: result.retiredAge,
            seasons: result.seasons.length,
          })
        }}
      </p>
      <p class="text-sm text-muted">
        {{ t(`page.game.career.onboarding.countries.${result.country}`) }} ·
        {{ t(`page.game.career.onboarding.regions.${result.region}`) }} ·
        {{ t(`page.game.career.onboarding.roles.${result.role}.label`) }}
      </p>
    </div>

    <div class="border border-default p-4 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.end.finalRating") }}</p>
      <p class="text-3xl font-bold tabular-nums">{{ result.finalRating }}</p>
      <p class="mt-2 text-sm text-muted tabular-nums">
        {{ t("page.game.career.stats.form") }} {{ result.finalForm }} ·
        {{ t("page.game.career.stats.morale") }} {{ result.finalMorale }}
      </p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold">{{ t("page.game.career.end.palmarès") }}</h3>
      <ul v-if="hasTrophies" class="flex flex-col gap-1">
        <li
          v-if="trophyCounts.worlds > 0"
          class="border border-default px-3 py-2 text-sm font-medium"
        >
          {{ trophyCounts.worlds }}× {{ t("page.game.career.end.trophies.worlds") }}
        </li>
        <li v-if="trophyCounts.major > 0" class="border border-default px-3 py-2 text-sm">
          {{ trophyCounts.major }}× {{ t("page.game.career.end.trophies.major") }}
        </li>
        <li v-if="trophyCounts.regional > 0" class="border border-default px-3 py-2 text-sm">
          {{ trophyCounts.regional }}× {{ t("page.game.career.end.trophies.regional") }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ t("page.game.career.end.noTrophies") }}</p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold">{{ t("page.game.career.end.seasonRecap") }}</h3>
      <ul class="flex flex-col gap-2">
        <li
          v-for="season in result.seasons"
          :key="season.season"
          class="border border-default p-3 text-sm"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-medium">
              {{ t("page.game.career.season.recapTitle", { season: season.season }) }}
              — {{ season.teamName }}
            </p>
            <p class="shrink-0 text-muted tabular-nums">
              {{ t("page.game.career.results.points", { points: season.points }) }}
            </p>
          </div>
          <p class="mt-1 text-muted">
            {{ t("page.game.career.results.major", { split: 1 }) }}: {{ majorSummary(season, 1) }} ·
            {{ t("page.game.career.results.major", { split: 2 }) }}:
            {{ majorSummary(season, 2) }}
          </p>
          <p class="text-muted">
            {{ t("page.game.career.results.worldsPlacementLabel") }}:
            {{
              season.worlds
                ? t(`page.game.career.placements.${season.worlds}`)
                : t("page.game.career.results.worldsNotQualifiedShort")
            }}
          </p>
        </li>
      </ul>
    </div>

    <div v-if="!shared" class="flex flex-col gap-2 sm:flex-row">
      <UButton class="flex-1" variant="outline" @click="onShare">
        {{ t("page.game.career.end.share") }}
      </UButton>
      <UButton class="flex-1" @click="emit('playAgain')">
        {{ t("page.game.career.end.playAgain") }}
      </UButton>
    </div>
  </div>
</template>
