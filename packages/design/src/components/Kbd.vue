<script setup lang="ts">
import type { KbdSize } from "../types.ts";

const { size = "md", value = null } = defineProps<{
  size?: KbdSize;
  value?: string | null;
}>();
</script>

<template>
  <kbd class="sb-kbd" :data-size="size">
    <slot>{{ value }}</slot>
  </kbd>
</template>

<style scoped>
/* Mirrors Nuxt UI's kbd theme (outline variant). */
@layer components {
  .sb-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.25rem;
    background: var(--sb-bg);
    box-shadow: inset 0 0 0 1px var(--sb-border);
    color: var(--sb-text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .sb-kbd[data-size="sm"] {
    min-width: 1rem;
    height: 1rem;
    font-size: 10px;
  }
}
</style>
