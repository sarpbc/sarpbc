<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem } from "reka-ui";
import { computed } from "vue";

import { useRadioGroup } from "../radio-group.ts";

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
  /** Once settled, whether this choice was right: tints the chosen card. */
  status?: RadioStatus | null;
  value: SelectValue;
}>();

const group = useRadioGroup();
const variant = computed(() => group?.variant.value ?? "list");
</script>

<template>
  <RadioGroupItem
    :value="value"
    :disabled="disabled"
    class="sb-radio"
    :data-variant="variant"
    :data-status="status ?? undefined"
    :data-rich="description !== null || undefined"
  >
    <span v-if="variant === 'list'" class="sb-radio__control" aria-hidden="true">
      <RadioGroupIndicator class="sb-radio__dot" />
    </span>
    <span class="sb-radio__label">
      <slot>{{ label }}</slot>
      <span v-if="description !== null" class="sb-radio__description">{{ description }}</span>
    </span>
  </RadioGroupItem>
</template>

<style scoped>
@layer components {
  .sb-radio {
    --tone: var(--sb-primary);

    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--sb-text);
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: start;
    cursor: pointer;
  }

  .sb-radio:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-radio:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-radio[data-status="success"] {
    --tone: var(--sb-success);
  }

  .sb-radio[data-status="danger"] {
    --tone: var(--sb-error);
  }

  .sb-radio__control {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--sb-border-accented);
  }

  .sb-radio[data-state="checked"] .sb-radio__control {
    background: var(--tone);
    box-shadow: none;
  }

  .sb-radio__dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background: var(--sb-bg);
  }

  .sb-radio__label {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sb-radio__description {
    color: var(--sb-text-muted);
  }

  .sb-radio[data-variant="cards"] {
    justify-content: center;
    min-height: 1.75rem;
    padding: 0.25rem 0.625rem;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    font-size: var(--sb-control-text);
    font-weight: 500;
    transition-property: color, background-color, box-shadow;
    transition-duration: var(--sb-duration-fast);
  }

  @media (hover: hover) {
    .sb-radio[data-variant="cards"]:hover:enabled:not([data-state="checked"]) {
      background: var(--sb-bg-elevated);
    }
  }

  .sb-radio[data-variant="cards"][data-state="checked"] {
    position: relative;
    z-index: 1;
    background: color-mix(in oklab, var(--tone) 10%, var(--sb-bg));
    box-shadow: inset 0 0 0 1px var(--tone);
    color: var(--sb-text-highlighted);
  }

  .sb-radio[data-variant="cards"] .sb-radio__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-radio[data-variant="cards"] + .sb-radio[data-variant="cards"] {
    margin-inline-start: -1px;
  }

  .sb-radio[data-variant="cards"][data-rich] {
    justify-content: flex-start;
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  .sb-radio[data-variant="cards"][data-rich] .sb-radio__label {
    gap: 0.25rem;
    white-space: normal;
  }

  .sb-radio[data-variant="cards"][data-rich] + .sb-radio[data-variant="cards"][data-rich] {
    margin-inline-start: 0;
  }

  .sb-radio__description {
    font-weight: 400;
  }

  .sb-radio[data-variant="text"] {
    gap: 0;
    padding: 0.25rem 0.375rem;
    color: var(--sb-text-muted);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  .sb-radio[data-variant="text"] + .sb-radio[data-variant="text"]::before {
    margin-inline: -0.375rem 0.375rem;
    color: var(--sb-text-dimmed);
    font-weight: 400;
    content: "/";
  }

  @media (hover: hover) {
    .sb-radio[data-variant="text"]:hover:enabled {
      color: var(--sb-text-highlighted);
    }
  }

  .sb-radio[data-variant="text"][data-state="checked"] {
    color: var(--sb-text-highlighted);
  }
}
</style>
