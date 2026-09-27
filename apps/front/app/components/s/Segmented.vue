<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const { items, ariaLabel } = defineProps<{
  items: TabsItem[];
  ariaLabel: string;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <UTabs
    :model-value="model"
    :items="items"
    :content="false"
    color="neutral"
    variant="pill"
    size="xs"
    :aria-label="ariaLabel"
    :ui="{
      list: 'rounded-none bg-transparent p-0 border border-default',
      indicator: 'rounded-none bg-elevated shadow-none inset-y-0',
      trigger: 'rounded-none data-[state=active]:text-highlighted',
    }"
    @update:model-value="model = String($event)"
  />
</template>
