<script lang="ts" setup>
import type { CareerResult, CareerSeasonRecord } from "~/types/career";

const { result, shared = false } = defineProps<{
  result: CareerResult;
  shared?: boolean;
}>();

const emit = defineEmits<{
  playAgain: [];
  share: [];
}>();

const { t } = useI18n();
const toast = useToast();

const onShare = () => {
  emit("share");
  toast.add({ color: "success", title: t("page.game.career.end.shareCopied") });
};

const TROPHY_TYPES = ["worlds", "major", "regional"] as const;

const trophyLines = computed(() => {
  const counts = { major: 0, regional: 0, worlds: 0 };

  for (const trophy of result.trophies) {
    counts[trophy.type] += 1;
  }

  return TROPHY_TYPES.flatMap((type) => (counts[type] > 0 ? [{ count: counts[type], type }] : []));
});

const nickname = computed(() => t(`page.game.career.end.nicknames.${result.nicknameKey}`));

const majorSummary = (season: CareerSeasonRecord, split: number): string => {
  const record = season.splits.find((entry) => entry.split === split);

  if (!record) {
    return t("page.game.career.results.majorNotQualified");
  }

  return record.major
    ? t(`page.game.career.placements.${record.major}`)
    : t("page.game.career.results.majorNotQualified");
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-2 text-center">
      <h2 class="text-lg font-medium tracking-tight">
        {{ shared ? t("page.game.career.end.viewShared") : t("page.game.career.end.title") }}
      </h2>
      <p class="text-xl font-medium tracking-tight">
        {{ result.playerName }}
        <span class="font-medium text-muted"> · {{ nickname }}</span>
      </p>
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

    <div class="border border-separator p-4 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.end.finalRating") }}</p>
      <p class="text-3xl font-medium tabular-nums">{{ result.finalRating }}</p>
      <p class="mt-2 text-sm text-muted tabular-nums">
        {{ t("page.game.career.stats.form") }} {{ result.finalForm }} ·
        {{ t("page.game.career.stats.morale") }} {{ result.finalMorale }}
      </p>
    </div>

    <HubRail caption="lead" :title="t('page.game.career.end.palmarès')">
      <HubCard>
        <ul class="flex flex-col">
          <li
            v-for="line in trophyLines"
            :key="line.type"
            class="border-b border-separator px-2 py-1.5 text-sm"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t(`page.game.career.end.trophies.${line.type}`) }}
              </p>
              <p class="shrink-0 text-right text-muted tabular-nums">{{ line.count }}×</p>
            </div>
          </li>
          <li
            v-if="trophyLines.length === 0"
            class="border-b border-separator px-2 py-1.5 text-sm text-muted"
          >
            {{ t("page.game.career.end.noTrophies") }}
          </li>
        </ul>
      </HubCard>
    </HubRail>

    <HubRail caption="lead" :title="t('page.game.career.end.seasonRecap')">
      <HubCard>
        <ul class="flex flex-col">
          <li
            v-for="season in result.seasons"
            :key="season.season"
            class="border-b border-separator px-2 py-1.5 text-sm"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 font-medium">
                {{ t("page.game.career.season.recapTitle", { season: season.season }) }}:
                {{ season.teamName }}
              </p>
              <p class="shrink-0 text-right text-muted tabular-nums">
                {{ t("page.game.career.results.points", { points: season.points }) }}
              </p>
            </div>
            <p class="text-muted">
              <template v-for="(split, index) in season.splits" :key="split.split">
                <span v-if="index > 0"> · </span>
                {{ t("page.game.career.results.major", { split: split.split }) }}:
                {{ majorSummary(season, split.split) }}
              </template>
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
      </HubCard>
    </HubRail>

    <div v-if="!shared" class="flex flex-col gap-2 sm:flex-row">
      <SButton class="flex-1" variant="secondary" @click="onShare">
        {{ t("page.game.career.end.share") }}
      </SButton>
      <SButton class="flex-1" @click="emit('playAgain')">
        {{ t("page.game.career.end.playAgain") }}
      </SButton>
    </div>
  </div>
</template>
