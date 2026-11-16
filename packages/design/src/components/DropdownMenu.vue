<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "reka-ui";

import { useDesignAdapters } from "../adapters.ts";

import type { MenuItem, OverlayAlign } from "../types.ts";

const { align = "start", items } = defineProps<{
  align?: OverlayAlign;
  items: readonly (readonly MenuItem[])[];
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="sb-menu" :align="align" :side-offset="4" :collision-padding="8">
        <template v-for="(group, index) in items" :key="index">
          <DropdownMenuSeparator v-if="index > 0" class="sb-menu__separator" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="item in group"
              :key="item.label"
              class="sb-menu__item"
              :data-danger="item.danger || undefined"
              :disabled="item.disabled"
              @select="item.onSelect"
            >
              <component
                :is="adapters.icon"
                v-if="item.icon !== undefined"
                :name="item.icon"
                class="sb-menu__icon"
              />
              <span class="sb-menu__label">{{ item.label }}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style>
/* Not scoped: Reka renders the content through a portal, which drops the scope attribute. */
@layer components {
  .sb-menu {
    z-index: 50;
    min-width: 10rem;
    padding: 0.25rem;
    background: var(--sb-bg);
    box-shadow:
      inset 0 0 0 1px var(--sb-border),
      0 4px 12px rgb(0 0 0 / 0.12);
    animation: sb-fade-in var(--sb-duration-fast) var(--sb-ease-out);
  }

  .sb-menu__separator {
    height: 1px;
    margin: 0.25rem -0.25rem;
    background: var(--sb-border);
  }

  .sb-menu__item {
    --ink: var(--sb-text);

    display: flex;
    gap: 0.375rem;
    align-items: center;
    height: 1.75rem;
    padding: 0 0.375rem;
    color: var(--ink);
    font-size: var(--sb-control-text);
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  .sb-menu__item[data-highlighted] {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-highlighted);
  }

  .sb-menu__item[data-danger] {
    --ink: var(--sb-error);
  }

  .sb-menu__item[data-danger][data-highlighted] {
    background: color-mix(in oklab, var(--sb-error) 10%, transparent);
    color: var(--sb-error);
  }

  .sb-menu__item[data-disabled] {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-menu__icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }

  .sb-menu__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
