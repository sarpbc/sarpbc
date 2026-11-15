<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { NavigationItem } from "../types.ts";

const { items, orientation = "horizontal" } = defineProps<{
  items: readonly NavigationItem[];
  /** horizontal: a header bar of text links. vertical: a sidebar of rows with icons. */
  orientation?: "horizontal" | "vertical";
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <nav class="sb-nav" :data-orientation="orientation">
    <ul class="sb-nav__list">
      <li v-for="item in items" :key="item.label" class="sb-nav__item">
        <component
          :is="adapters.link"
          :to="item.to"
          :target="item.target"
          class="sb-nav__link"
          :data-active="item.active || undefined"
        >
          <component :is="adapters.icon" v-if="item.icon" :name="item.icon" class="sb-nav__icon" />
          <span class="sb-nav__label">{{ item.label }}</span>
        </component>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
@layer components {
  .sb-nav__list {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sb-nav[data-orientation="vertical"] .sb-nav__list {
    flex-direction: column;
    align-items: stretch;
  }

  .sb-nav__link {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    min-width: 0;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    text-decoration: none;
    transition: color var(--sb-duration-fast);
  }

  .sb-nav[data-orientation="horizontal"] .sb-nav__link {
    padding: 0.375rem 0.625rem;
  }

  .sb-nav__link:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .sb-nav__link:hover {
      color: var(--sb-text-highlighted);
    }
  }

  /* An item is active when the app says so, or when the router matches its link. */
  .sb-nav__link[data-active],
  .sb-nav__link.router-link-active {
    color: var(--sb-text-highlighted);
  }

  .sb-nav[data-orientation="vertical"] .sb-nav__link {
    height: 2rem;
    padding: 0 0.5rem;
  }

  @media (hover: hover) {
    .sb-nav[data-orientation="vertical"] .sb-nav__link:hover {
      background: color-mix(in oklab, var(--sb-bg-elevated) 50%, transparent);
    }
  }

  .sb-nav[data-orientation="vertical"] .sb-nav__link[data-active],
  .sb-nav[data-orientation="vertical"] .sb-nav__link.router-link-active {
    background: var(--sb-bg-elevated);
  }

  .sb-nav__icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
  }

  .sb-nav__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
