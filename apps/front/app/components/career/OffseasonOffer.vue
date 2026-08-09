<script lang="ts" setup>
defineProps<{
  offerTeam: string;
  currentTeam: string;
}>();

const emit = defineEmits<{
  accept: [];
  stay: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4 text-center">
    <h2 class="text-lg font-semibold tracking-tight">
      {{ t("page.game.career.offseason.title") }}
    </h2>
    <p class="text-sm text-muted text-pretty">
      {{
        t("page.game.career.offseason.body", {
          team: offerTeam,
          currentTeam,
        })
      }}
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
