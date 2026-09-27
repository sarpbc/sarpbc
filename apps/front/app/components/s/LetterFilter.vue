<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

const { active, to } = defineProps<{
  /** Selected letter, or an empty string for "all". */
  active: string;
  to: (letter: string) => RouteLocationRaw;
}>();

const { t } = useI18n();

const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "123"];
</script>

<template>
  <SCard class="flex h-row items-center overflow-x-auto">
    <nav class="flex w-full min-w-max items-center gap-px px-1.5" :aria-label="t('common.all')">
      <UButton
        variant="soft"
        size="xs"
        :color="!active ? 'primary' : 'neutral'"
        :to="to('')"
        :aria-current="!active ? 'page' : undefined"
        class="h-7 shrink-0 justify-center px-2"
      >
        {{ t("common.all") }}
      </UButton>
      <UButton
        v-for="letter in letters"
        :key="letter"
        variant="soft"
        size="xs"
        :color="active === letter ? 'primary' : 'neutral'"
        :to="to(letter)"
        :aria-current="active === letter ? 'page' : undefined"
        class="h-7 min-w-6 flex-1 justify-center px-0.5"
      >
        {{ letter }}
      </UButton>
    </nav>
  </SCard>
</template>
