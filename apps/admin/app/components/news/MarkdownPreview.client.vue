<script setup lang="ts">
import type { MDCParserResult } from "@nuxtjs/mdc";
import { parseMarkdown } from "@nuxtjs/mdc/runtime";
import { newsMdcComponents } from "~/utils/news-mdc-components";

const { value } = defineProps<{
  value: string;
}>();

const parsed = ref<MDCParserResult | null>(null);

const proseClass =
  "sb-prose news-prose text-default [&>:first-child]:mt-0 [&_h2]:in-prose:text-lg [&_h2]:in-prose:font-semibold [&_h2]:in-prose:text-highlighted [&_h2]:in-prose:mt-6 [&_h2]:in-prose:mb-3 [&_h2]:in-prose:first:mt-0 [&_h3]:in-prose:font-medium [&_h3]:in-prose:text-highlighted [&_h3]:in-prose:mb-2 [&_h3]:in-prose:mt-4 [&_p]:in-prose:mt-0 [&_p]:in-prose:mb-3 [&_ul]:in-prose:list-disc [&_ul]:in-prose:list-inside [&_ul]:in-prose:space-y-1 [&_ul]:in-prose:mb-3 [&_ol]:in-prose:list-decimal [&_ol]:in-prose:list-inside [&_ol]:in-prose:space-y-1 [&_ol]:in-prose:mb-3 [&_a]:in-prose:text-highlighted [&_a]:in-prose:hover:text-primary [&_a]:in-prose:font-medium [&_strong]:in-prose:text-highlighted [&_table]:in-prose:w-full [&_table]:in-prose:border-collapse [&_table]:in-prose:my-4 [&_table]:in-prose:text-sm [&_th]:in-prose:border [&_th]:in-prose:border-default [&_th]:in-prose:bg-elevated [&_th]:in-prose:px-3 [&_th]:in-prose:py-2 [&_th]:in-prose:text-left [&_th]:in-prose:font-medium [&_th]:in-prose:text-highlighted [&_td]:in-prose:border [&_td]:in-prose:border-default [&_td]:in-prose:px-3 [&_td]:in-prose:py-2 [&_tr]:in-prose:border-b [&_tr]:in-prose:border-default";

const refreshPreview = async (markdown: string) => {
  const trimmed = markdown.trim();

  if (!trimmed) {
    parsed.value = null;

    return;
  }

  parsed.value = await parseMarkdown(trimmed);
};

watch(
  () => value,
  (markdown) => {
    void refreshPreview(markdown);
  },
  { immediate: true },
);
</script>

<template>
  <MDCRenderer
    v-if="parsed?.body"
    :body="parsed.body"
    :data="parsed.data"
    :components="newsMdcComponents"
    :class="proseClass"
  />
</template>
