<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { useId } from "vue";

import { useDesignAdapters } from "../adapters.ts";

const model = defineModel<boolean>({ default: false });

const { disabled = false, label = null } = defineProps<{
  disabled?: boolean;
  label?: string | null;
}>();

const adapters = useDesignAdapters();
const id = useId();
</script>

<template>
  <span class="sb-checkbox">
    <CheckboxRoot :id="id" v-model="model" :disabled="disabled" class="sb-checkbox__box">
      <CheckboxIndicator class="sb-checkbox__indicator">
        <component :is="adapters.icon" name="i-lucide-check" class="sb-checkbox__icon" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <label v-if="label !== null || $slots.default" :for="id" class="sb-checkbox__label">
      <slot>{{ label }}</slot>
    </label>
  </span>
</template>

<style scoped>
@layer components {
  .sb-checkbox {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
  }

  .sb-checkbox__box {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: 0;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    color: var(--sb-text-inverted);
    cursor: pointer;
  }

  .sb-checkbox__box[data-state="checked"] {
    background: var(--sb-primary);
    box-shadow: none;
  }

  .sb-checkbox__box:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-checkbox__box:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-checkbox__indicator {
    display: flex;
  }

  .sb-checkbox__icon {
    width: 0.75rem;
    height: 0.75rem;
  }

  .sb-checkbox__label {
    color: var(--sb-text);
    font-size: 0.875rem;
    line-height: 1.25rem;
    cursor: pointer;
  }
}
</style>
