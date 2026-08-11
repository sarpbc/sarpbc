<script lang="ts" setup>
defineProps<{
  offerTeamName: string;
  offerTeamRank: number | null;
  currentTeamName: string;
  currentTeamRank: number | null;
}>();

const emit = defineEmits<{
  accept: [];
  stay: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-2 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t("page.game.career.offseason.title") }}
      </h2>
      <p class="text-sm text-muted text-pretty">
        {{ t("page.game.career.offseason.body", { team: offerTeamName }) }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="border border-default p-3 text-center">
        <p class="text-xs text-muted">{{ t("page.game.career.offseason.currentTeam") }}</p>
        <p class="mt-1 truncate text-sm font-semibold">{{ currentTeamName }}</p>
        <p v-if="currentTeamRank" class="text-xs text-muted tabular-nums">
          {{ t("page.game.career.offseason.worldRank", { rank: currentTeamRank }) }}
        </p>
      </div>
      <div class="border border-primary p-3 text-center">
        <p class="text-xs text-muted">{{ t("page.game.career.offseason.offerTeam") }}</p>
        <p class="mt-1 truncate text-sm font-semibold">{{ offerTeamName }}</p>
        <p v-if="offerTeamRank" class="text-xs text-muted tabular-nums">
          {{ t("page.game.career.offseason.worldRank", { rank: offerTeamRank }) }}
        </p>
      </div>
    </div>

    <p class="text-center text-xs text-muted">
      {{ t("page.game.career.offseason.hint") }}
    </p>

    <div class="flex flex-col gap-2 sm:flex-row">
      <UButton class="flex-1" @click="emit('accept')">
        {{ t("page.game.career.offseason.accept") }}
      </UButton>
      <UButton class="flex-1" variant="outline" @click="emit('stay')">
        {{ t("page.game.career.offseason.stay") }}
      </UButton>
    </div>
  </div>
</template>
