<script lang="ts" setup>
import type { CareerDestiny } from "~/types/career";
import { CAREER_DESTINIES } from "~/types/career";

defineProps<{
  recommended: CareerDestiny;
}>();

const emit = defineEmits<{
  choose: [destiny: CareerDestiny];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="space-y-2 text-center">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ t("page.game.career.destiny.title") }}
      </h2>
      <p class="text-sm text-muted text-pretty">
        {{ t("page.game.career.destiny.body") }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <UButton
        v-for="destiny in CAREER_DESTINIES"
        :key="destiny"
        :variant="destiny === recommended ? 'solid' : 'outline'"
        class="flex flex-col items-start gap-1 py-3 text-left"
        @click="emit('choose', destiny)"
      >
        <span class="font-semibold">
          {{ t(`page.game.career.destiny.${destiny}.label`) }}
          <span v-if="destiny === recommended" class="text-xs font-normal opacity-80">
            · {{ t("page.game.career.destiny.recommended") }}
          </span>
        </span>
        <span class="text-xs font-normal text-pretty opacity-80">
          {{ t(`page.game.career.destiny.${destiny}.description`) }}
        </span>
      </UButton>
    </div>
  </div>
</template>
