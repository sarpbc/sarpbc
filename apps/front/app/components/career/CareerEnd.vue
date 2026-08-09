<script lang="ts" setup>
import type { CareerResult } from "~/types/career";

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
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-2 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ shared ? t("page.game.career.end.viewShared") : t("page.game.career.end.title") }}
      </h2>
      <p class="text-xl font-bold tracking-tight">{{ result.playerName }}</p>
      <p class="text-sm text-muted">
        {{ t(`page.game.career.onboarding.regions.${result.region}`) }} ·
        {{ t(`page.game.career.onboarding.roles.${result.role}`) }}
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
      <ul v-if="result.trophies.length" class="flex flex-col gap-1">
        <li
          v-for="(trophy, index) in result.trophies"
          :key="index"
          class="border border-default px-3 py-2 text-sm"
        >
          {{ t(trophy) }}
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
          <p class="font-medium">
            {{ t("page.game.career.season.introTitle", { season: season.season, total: 5 }) }}
            — {{ season.team }}
          </p>
          <p class="text-muted">{{ t(season.placement) }}</p>
          <p class="tabular-nums text-muted">
            {{ t("page.game.career.end.finalRating") }}: {{ season.ratingEnd }}
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
