<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { VNode } from "vue";

const {
  hint = null,
  icon,
  title,
} = defineProps<{
  hint?: string | null;
  icon: string;
  title: string;
}>();

/* Actions that lead out of the empty state, such as clearing a filter. */
defineSlots<{ default?: () => VNode[] }>();

const adapters = useDesignAdapters();
</script>

<template>
  <div class="sb-state">
    <component :is="adapters.icon" :name="icon" class="sb-state__icon" aria-hidden="true" />
    <p class="sb-state__title">{{ title }}</p>
    <p v-if="hint !== null" class="sb-state__hint">{{ hint }}</p>
    <div v-if="$slots.default" class="sb-state__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
@layer components {
  .sb-state {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 2rem 1rem;
    text-align: center;
  }

  .sb-state__icon {
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    color: var(--sb-text-muted);
  }

  .sb-state__title,
  .sb-state__hint {
    margin: 0;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-wrap: pretty;
  }

  .sb-state__hint {
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .sb-state__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
  }
}
</style>
