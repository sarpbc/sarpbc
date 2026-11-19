<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, HoverCardRoot, HoverCardTrigger } from "reka-ui";

import type { OverlayAlign, OverlaySide } from "../types.ts";

const open = defineModel<boolean>("open", { default: false });

const { align = "center", side = "bottom" } = defineProps<{
  align?: OverlayAlign;
  side?: OverlaySide;
}>();

const toggleOnTouch = (event: PointerEvent) => {
  if (event.pointerType === "touch") {
    open.value = !open.value;
  }
};
</script>

<template>
  <HoverCardRoot v-model:open="open" :open-delay="0" :close-delay="100">
    <HoverCardTrigger as-child @pointerdown="toggleOnTouch">
      <slot />
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent
        class="sb-hover-card"
        :side="side"
        :align="align"
        :side-offset="8"
        :collision-padding="8"
      >
        <slot name="content" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-hover-card {
    z-index: 50;
    overflow: hidden;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 1px 3px rgb(0 0 0 / 0.1);
  }
}
</style>
