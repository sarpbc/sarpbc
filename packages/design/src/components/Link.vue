<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { LinkVariant } from "../types.ts";

const { to, variant = "primary" } = defineProps<{
  to: string | object;
  variant?: LinkVariant;
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <component :is="adapters.link" :to="to" class="sb-link" :data-variant="variant">
    <slot />
  </component>
</template>

<style scoped>
@layer components {
  .sb-link {
    color: var(--sb-text-muted);
    text-decoration: none;
    transition-property: color, text-decoration-color;
    transition-duration: var(--sb-duration-fast);
  }

  .sb-link:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .sb-link:hover {
      color: var(--sb-text-highlighted);
    }
  }

  .sb-link[data-variant="secondary"] {
    text-decoration: underline dashed var(--sb-text-dimmed);
    text-underline-offset: 3px;
  }

  @media (hover: hover) {
    .sb-link[data-variant="secondary"]:hover {
      text-decoration-color: currentColor;
    }
  }
}
</style>
