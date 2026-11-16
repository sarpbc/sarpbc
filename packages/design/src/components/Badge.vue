<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { BadgeColor } from "../types.ts";

const {
  color = "neutral",
  icon = null,
  label = null,
} = defineProps<{
  color?: BadgeColor;
  icon?: string | null;
  label?: string | number | null;
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <span class="sb-badge" :data-color="color">
    <component :is="adapters.icon" v-if="icon !== null" :name="icon" class="sb-badge__icon" />
    <slot>
      <span class="sb-badge__label">{{ label }}</span>
    </slot>
  </span>
</template>

<style scoped>
@layer components {
  .sb-badge {
    --tone: var(--sb-text);

    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    padding: 0.25rem 0.375rem;
    background: color-mix(in oklab, var(--tone) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--tone) 25%, transparent);
    color: var(--tone);
    font-size: 10px;
    font-weight: 500;
    line-height: 0.75rem;
  }

  .sb-badge[data-color="neutral"] {
    background: var(--sb-bg-elevated);
    box-shadow: inset 0 0 0 1px var(--sb-border);
  }

  .sb-badge[data-color="info"] {
    --tone: var(--sb-info);
  }

  .sb-badge[data-color="success"] {
    --tone: var(--sb-success);
  }

  .sb-badge[data-color="warning"] {
    --tone: var(--sb-warning);
  }

  .sb-badge[data-color="danger"] {
    --tone: var(--sb-error);
  }

  .sb-badge__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-badge__icon {
    flex-shrink: 0;
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
