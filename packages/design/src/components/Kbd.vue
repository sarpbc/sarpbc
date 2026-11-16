<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import type { KbdSize } from "../types.ts";

const { size = "md", value = null } = defineProps<{
  size?: KbdSize;
  /** A character, or a key name such as `meta`, `enter` or `escape`. */
  value?: string | null;
}>();

/* Modifier glyphs depend on the platform, known only in the browser. */
const isMac = ref(false);

onMounted(() => {
  isMac.value = /Mac|iPhone|iPad/u.test(navigator.userAgent);
});

const KEYS: ReadonlyMap<string, readonly [mac: string, other: string]> = new Map([
  ["alt", ["⌥", "Alt"]],
  ["arrowdown", ["↓", "↓"]],
  ["arrowleft", ["←", "←"]],
  ["arrowright", ["→", "→"]],
  ["arrowup", ["↑", "↑"]],
  ["ctrl", ["⌃", "Ctrl"]],
  ["enter", ["↵", "↵"]],
  ["escape", ["Esc", "Esc"]],
  ["meta", ["⌘", "Ctrl"]],
  ["shift", ["⇧", "Shift"]],
]);

const label = computed(() => {
  if (value === null) {
    return null;
  }

  const glyphs = KEYS.get(value.toLowerCase());

  return glyphs === undefined ? value : glyphs[isMac.value ? 0 : 1];
});
</script>

<template>
  <kbd class="sb-kbd" :data-size="size">
    <slot>{{ label }}</slot>
  </kbd>
</template>

<style scoped>
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
