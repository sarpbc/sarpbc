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
    <nav
      class="flex w-full min-w-max items-center gap-px px-1.5"
      :aria-label="t('common.filterByLetter')"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :to="to('')"
        :aria-current="!active ? 'page' : undefined"
        class="h-7 shrink-0 justify-center px-2 pointer-coarse:h-10 selectable"
      >
        {{ t("common.all") }}
      </UButton>
      <UButton
        v-for="letter in letters"
        :key="letter"
        color="neutral"
        variant="ghost"
        size="xs"
        :to="to(letter)"
        :aria-current="active === letter ? 'page' : undefined"
        class="h-7 min-w-6 flex-1 justify-center px-0.5 pointer-coarse:h-10 pointer-coarse:min-w-10 selectable"
      >
        {{ letter }}
      </UButton>
    </nav>
  </SCard>
</template>
