<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";

import type { OverlaySide } from "../types.ts";

const { side = "top", text } = defineProps<{
  side?: OverlaySide;
  text: string;
}>();
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="sb-tooltip" :side="side" :side-offset="4" :collision-padding="8">
          {{ text }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-tooltip {
    z-index: 50;
    max-width: 20rem;
    padding: 0.25rem 0.5rem;
    background: var(--sb-bg-inverted);
    color: var(--sb-text-inverted);
    font-size: 0.75rem;
    line-height: 1rem;
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }
}
</style>
