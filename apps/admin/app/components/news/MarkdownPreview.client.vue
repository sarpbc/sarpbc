<script setup lang="ts">
import type { MDCParserResult } from "@nuxtjs/mdc";
import { parseMarkdown } from "@nuxtjs/mdc/runtime";
import { newsMdcComponents } from "~/utils/newsMdcComponents";

const props = defineProps<{
  value: string;
}>();

const parsed = ref<MDCParserResult | null>(null);

const proseClass =
  "news-prose text-default [&>:first-child]:mt-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-highlighted [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_h3]:font-medium [&_h3]:text-highlighted [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mt-0 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_a]:text-highlighted [&_a]:hover:text-primary [&_a]:font-medium [&_strong]:text-highlighted [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm [&_th]:border [&_th]:border-default [&_th]:bg-elevated [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-highlighted [&_td]:border [&_td]:border-default [&_td]:px-3 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-default";

async function refreshPreview(markdown: string) {
  const trimmed = markdown.trim();
  if (!trimmed) {
    parsed.value = null;
    return;
  }

  parsed.value = await parseMarkdown(trimmed);
}

watch(
  () => props.value,
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
