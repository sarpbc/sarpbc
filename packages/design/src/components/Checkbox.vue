<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { useId } from "vue";

import { useDesignAdapters } from "../adapters.ts";

/* `indeterminate` shows a partial selection, such as a table header with some rows checked; a click checks it. */
const model = defineModel<boolean | "indeterminate">({ default: false });

const {
  ariaLabel = null,
  disabled = false,
  label = null,
} = defineProps<{
  ariaLabel?: string | null;
  disabled?: boolean;
  label?: string | null;
}>();

const adapters = useDesignAdapters();
const id = useId();
</script>

<template>
  <span class="sb-checkbox">
    <CheckboxRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      :aria-label="ariaLabel ?? undefined"
      class="sb-checkbox__box"
    >
      <CheckboxIndicator class="sb-checkbox__indicator">
        <component
          :is="adapters.icon"
          :name="model === 'indeterminate' ? 'i-lucide-minus' : 'i-lucide-check'"
          class="sb-checkbox__icon"
        />
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
    width: 0.875rem;
    height: 0.875rem;
    padding: 0;
    border: 0;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border-accented);
    color: var(--sb-text-inverted);
    cursor: pointer;
  }

  .sb-checkbox__box[data-state="checked"],
  .sb-checkbox__box[data-state="indeterminate"] {
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
    width: 0.625rem;
    height: 0.625rem;
  }

  .sb-checkbox__label {
    color: var(--sb-text);
    font-size: 0.875rem;
    line-height: 1.25rem;
    cursor: pointer;
  }
}
</style>
