<script lang="ts" setup>
defineProps<{
  canContinue: boolean;
  continueName: string;
}>();

const emit = defineEmits<{
  newCareer: [];
  continue: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2">
    <UButton v-if="canContinue" block @click="emit('continue')">
      {{ t("page.game.career.menu.continue") }}
    </UButton>
    <p v-if="canContinue && continueName" class="text-center text-xs text-muted">
      {{ continueName }}
    </p>
    <UButton block :variant="canContinue ? 'outline' : 'solid'" @click="emit('newCareer')">
      {{ t("page.game.career.menu.newCareer") }}
    </UButton>
  </div>
</template>
