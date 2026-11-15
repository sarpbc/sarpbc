<script setup lang="ts" generic="T extends SelectValue">
import { RadioGroupRoot } from "reka-ui";
import { computed, provide } from "vue";

import { RADIO_GROUP } from "../radio-group.ts";

import type { RadioVariant, SelectOption, SelectValue } from "../types.ts";

import Radio from "./Radio.vue";

const model = defineModel<T | null>({ default: null });

const {
  disabled = false,
  items = null,
  orientation = "vertical",
  variant = "list",
} = defineProps<{
  disabled?: boolean;
  /** Renders one radio per item; leave it out to place `SbRadio` children yourself. */
  items?: readonly SelectOption<T>[] | null;
  orientation?: "vertical" | "horizontal";
  variant?: RadioVariant;
}>();

provide(RADIO_GROUP, { variant: computed(() => variant) });
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    class="sb-radio-group"
    :data-variant="variant"
    :orientation="orientation"
    :disabled="disabled"
  >
    <slot>
      <Radio
        v-for="item in items ?? []"
        :key="String(item.value)"
        :value="item.value"
        :label="item.label"
        :aria-label="item.ariaLabel"
        :description="item.description ?? null"
        :disabled="item.disabled"
      />
    </slot>
  </RadioGroupRoot>
</template>

<style scoped>
@layer components {
  .sb-radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sb-radio-group[aria-orientation="horizontal"] {
    flex-flow: row wrap;
    gap: 0.5rem 1rem;
  }

  .sb-radio-group[data-variant="cards"][aria-orientation="horizontal"],
  .sb-radio-group[data-variant="text"] {
    gap: 0;
  }
}
</style>
