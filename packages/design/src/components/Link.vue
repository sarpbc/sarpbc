<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { LinkVariant } from "../types.ts";

const { to, variant = "secondary" } = defineProps<{
  /** A path, a URL or a route location; the app's link adapter resolves it. */
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
    --ink: var(--sb-text-muted);
    --ink-hover: var(--sb-text-highlighted);

    color: var(--ink);
    text-decoration: none;
  }

  .sb-link:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .sb-link:hover {
      color: var(--ink-hover);
    }
  }

  .sb-link[data-variant="primary"] {
    --ink: var(--sb-link);
    --ink-hover: var(--sb-link-hover);

    font-weight: 500;
  }
}
</style>
