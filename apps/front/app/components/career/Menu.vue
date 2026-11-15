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
    <SbButton v-if="canContinue" block @click="emit('continue')">
      {{ t("page.game.career.menu.continue") }}
    </SbButton>
    <p v-if="canContinue && continueName" class="text-center text-xs text-muted">
      {{ continueName }}
    </p>
    <SbButton block :variant="canContinue ? 'secondary' : 'primary'" @click="emit('newCareer')">
      {{ t("page.game.career.menu.newCareer") }}
    </SbButton>
  </div>
</template>
