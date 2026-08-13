<script lang="ts" setup>
import { isCareerNicknameKey, type CareerResult, type CareerSeasonRecord } from "~/types/career";
import { pickCareerNickname } from "~/utils/career/nickname";

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

const TROPHY_TYPES = ["worlds", "major", "regional"] as const;

const trophyLines = computed(() => {
  const counts = { regional: 0, major: 0, worlds: 0 };
  for (const trophy of props.result.trophies) {
    counts[trophy.type] += 1;
  }
  return TROPHY_TYPES.filter((type) => counts[type] > 0).map((type) => ({
    type,
    count: counts[type],
  }));
});

const nickname = computed(() => {
  const key = isCareerNicknameKey(props.result.nicknameKey)
    ? props.result.nicknameKey
    : pickCareerNickname(props.result);
  return t(`page.game.career.end.nicknames.${key}`);
});

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
      <p class="text-xl font-bold tracking-tight">
        {{ result.playerName }}
        <span class="font-semibold text-muted"> · {{ nickname }}</span>
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

    <div class="border border-default p-4 text-center">
      <p class="text-xs text-muted">{{ t("page.game.career.end.finalRating") }}</p>
      <p class="text-3xl font-bold tabular-nums">{{ result.finalRating }}</p>
      <p class="mt-2 text-sm text-muted tabular-nums">
        {{ t("page.game.career.stats.form") }} {{ result.finalForm }} ·
        {{ t("page.game.career.stats.morale") }} {{ result.finalMorale }}
      </p>
    </div>

    <SRail caption="lead" :title="t('page.game.career.end.palmarès')">
      <SCard flush-bottom>
        <ul class="flex flex-col">
          <li
            v-for="line in trophyLines"
            :key="line.type"
            class="border-b border-default px-2 py-1.5 text-sm"
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
            class="border-b border-default px-2 py-1.5 text-sm text-muted"
          >
            {{ t("page.game.career.end.noTrophies") }}
          </li>
        </ul>
      </SCard>
    </SRail>

    <SRail caption="lead" :title="t('page.game.career.end.seasonRecap')">
      <SCard flush-bottom>
        <ul class="flex flex-col">
          <li
            v-for="season in result.seasons"
            :key="season.season"
            class="border-b border-default px-2 py-1.5 text-sm"
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
      </SCard>
    </SRail>

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
