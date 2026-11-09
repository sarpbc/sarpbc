<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const { items, ariaLabel } = defineProps<{
  items: TabsItem[];
  ariaLabel: string;
}>();

const model = defineModel<string>({ required: true });

/* `after:hidden` drops the link variant's active underline, drawn when the list has no indicator. */
const ui = {
  root: "gap-0",
  list: "h-7 w-fit gap-0 border border-default px-2 py-0",
  indicator: "hidden",
  trigger: [
    "grow-0 rounded-none px-1 py-0 text-xs font-medium transition-none after:hidden",
    "data-[state=inactive]:text-muted hover:data-[state=inactive]:text-default data-[state=active]:text-highlighted",
    "not-first-of-type:ps-0 not-first-of-type:before:me-2 not-first-of-type:before:font-normal not-first-of-type:before:text-dimmed not-first-of-type:before:content-['/']",
  ].join(" "),
};
</script>

<template>
  <UTabs
    :model-value="model"
    :items="items"
    :content="false"
    color="neutral"
    variant="link"
    size="xs"
    :aria-label="ariaLabel"
    :ui="ui"
    @update:model-value="model = String($event)"
  />
</template>
