<script setup lang="ts">
import * as z from "zod";
import type { RouteLocationRaw } from "vue-router";

const { active, to } = defineProps<{
  active: string;
  to: (letter: string) => RouteLocationRaw;
}>();

const { t } = useI18n();

const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "123"];

useAgentTool(
  defineAgentTool({
    annotations: { readOnlyHint: true },
    description:
      "Filter the list on screen to names starting with a letter, or show every name again. Use when the user wants to browse entries by their first letter.",
    input: z.object({
      letter: z
        .enum(["all", ...letters])
        .describe('A capital letter, "123" for names starting with a digit, or "all".'),
    }),
    name: "filter_list_by_letter",
  }),
  {
    execute: async ({ letter }) => {
      await navigateTo(to(letter === "all" ? "" : letter));
    },
  },
);
</script>

<template>
  <HubCard class="-mb-px flex h-row items-center overflow-x-auto">
    <nav
      class="flex w-full min-w-max items-center gap-px px-1.5"
      :aria-label="t('common.filterByLetter')"
    >
      <SButton
        variant="tertiary"
        size="sm"
        :to="to('')"
        :aria-current="!active ? 'page' : undefined"
        class="h-7 shrink-0 justify-center px-2 pointer-coarse:h-10 selectable"
      >
        {{ t("common.all") }}
      </SButton>
      <SButton
        v-for="letter in letters"
        :key="letter"
        variant="tertiary"
        size="sm"
        :to="to(letter)"
        :aria-current="active === letter ? 'page' : undefined"
        class="h-7 min-w-6 flex-1 justify-center px-0.5 pointer-coarse:h-10 pointer-coarse:min-w-10 selectable"
      >
        {{ letter }}
      </SButton>
    </nav>
  </HubCard>
</template>
