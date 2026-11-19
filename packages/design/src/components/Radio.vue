<script setup lang="ts">
import { RadioGroupItem } from "reka-ui";

import type { RadioStatus, SelectValue } from "../types.ts";

const {
  description = null,
  disabled = false,
  label = null,
  status = null,
  value,
} = defineProps<{
  description?: string | null;
  disabled?: boolean;
  label?: string | null;
  status?: RadioStatus | null;
  value: SelectValue;
}>();
</script>

<template>
  <RadioGroupItem
    :value="value"
    :disabled="disabled"
    class="sb-radio"
    :data-status="status ?? undefined"
    :data-rich="description !== null || undefined"
  >
    <span class="sb-radio__label">
      <slot>{{ label }}</slot>
      <span v-if="description !== null" class="sb-radio__description">{{ description }}</span>
    </span>
  </RadioGroupItem>
</template>

<style scoped>
@layer components {
  .sb-radio {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 1.75rem;
    padding: 0.25rem 0.625rem;
    border: 0;
    background: none;
    color: var(--sb-text-muted);
    font: inherit;
    font-size: var(--sb-control-text);
    font-weight: 500;
    line-height: 1.25rem;
    text-align: start;
    cursor: pointer;
    transition-property: color, background-color;
    transition-duration: var(--sb-duration-fast);
  }

  .sb-radio:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-radio:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .sb-radio:hover:enabled {
      color: var(--sb-text-highlighted);
    }
  }

  .sb-radio[data-state="checked"] {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-highlighted);
  }

  .sb-radio[data-state="checked"][data-status="success"] {
    background: color-mix(in oklab, var(--sb-success) 10%, var(--sb-bg));
  }

  .sb-radio[data-state="checked"][data-status="danger"] {
    background: color-mix(in oklab, var(--sb-error) 10%, var(--sb-bg));
  }

  .sb-radio__label {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-radio__description {
    color: var(--sb-text-muted);
    font-weight: 400;
  }

  .sb-radio[data-rich] {
    justify-content: flex-start;
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  .sb-radio[data-rich] .sb-radio__label {
    gap: 0.25rem;
    white-space: normal;
  }
}
</style>
