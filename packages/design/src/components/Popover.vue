<script setup lang="ts">
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui";

import type { OverlayAlign, OverlaySide } from "../types.ts";

const open = defineModel<boolean>("open", { default: false });

const {
  align = "center",
  dismissible = true,
  side = "bottom",
} = defineProps<{
  align?: OverlayAlign;
  dismissible?: boolean;
  side?: OverlaySide;
}>();

const keepOpen = (event: Event) => {
  if (!dismissible) {
    event.preventDefault();
  }
};
</script>

<template>
  <PopoverRoot v-model:open="open">
    <!-- An anchor positions the content without toggling it (e.g. a search field). -->
    <PopoverAnchor v-if="$slots.anchor" as-child>
      <slot name="anchor" />
    </PopoverAnchor>
    <PopoverTrigger v-else as-child>
      <slot />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="sb-popover"
        :side="side"
        :align="align"
        :side-offset="8"
        :collision-padding="8"
        @interact-outside="keepOpen"
        @escape-key-down="keepOpen"
        @open-auto-focus="$slots.anchor && $event.preventDefault()"
      >
        <slot name="content" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-popover {
    z-index: 50;
    overflow: hidden;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 4px 12px rgb(0 0 0 / 0.12);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-popover:focus-visible {
    outline: none;
  }
}
</style>
