<script lang="ts" setup>
defineProps<{
  season: number;
  age: number;
  teamName: string;
  teamRank: number | null;
}>();

const emit = defineEmits<{
  begin: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4 text-center">
    <h2 class="text-lg font-semibold tracking-tight">
      {{
        t("page.game.career.season.introTitle", {
          season,
          age,
        })
      }}
    </h2>
    <p class="text-sm text-muted text-pretty">
      {{
        t("page.game.career.season.introBody", {
          team: teamName,
          rank: teamRank ?? "—",
        })
      }}
    </p>
    <UButton block @click="emit('begin')">
      {{ t("page.game.career.season.begin") }}
    </UButton>
  </div>
</template>
