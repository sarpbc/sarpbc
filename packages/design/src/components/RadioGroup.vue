<script setup lang="ts" generic="T extends SelectValue">
import { RadioGroupRoot } from "reka-ui";

import type { SelectOption, SelectValue } from "../types.ts";

import Radio from "./Radio.vue";

const model = defineModel<T | null>({ default: null });

const {
  disabled = false,
  items = null,
  orientation = "vertical",
} = defineProps<{
  disabled?: boolean;
  items?: readonly SelectOption<T>[] | null;
  orientation?: "vertical" | "horizontal";
}>();
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    class="sb-radio-group"
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
    gap: 0;
  }
}
</style>
