<script setup lang="ts">
import { useDesignAdapters } from "../adapters.ts";

import type { BreadcrumbItem } from "../types.ts";

const { items } = defineProps<{
  items: readonly BreadcrumbItem[];
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <nav class="sb-breadcrumb" :aria-label="adapters.translate('breadcrumb')">
    <ol class="sb-breadcrumb__list">
      <li v-for="(item, index) in items" :key="index" class="sb-breadcrumb__item">
        <component
          :is="adapters.icon"
          v-if="index > 0"
          name="i-lucide-chevron-right"
          class="sb-breadcrumb__separator"
          aria-hidden="true"
        />
        <span v-if="index === items.length - 1" class="sb-breadcrumb__current" aria-current="page">
          {{ item.label }}
        </span>
        <component
          :is="adapters.link"
          v-else-if="item.to"
          :to="item.to"
          class="sb-breadcrumb__link"
        >
          {{ item.label }}
        </component>
        <span v-else class="sb-breadcrumb__link">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
@layer components {
  .sb-breadcrumb__list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sb-breadcrumb__item {
    display: inline-flex;
    gap: 0.375rem;
    align-items: center;
    min-width: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sb-breadcrumb__separator {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: var(--sb-text-dimmed);
  }

  .sb-breadcrumb__link {
    overflow: hidden;
    color: var(--sb-text-muted);
    font-weight: 500;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (hover: hover) {
    a.sb-breadcrumb__link:hover {
      color: var(--sb-text);
    }
  }

  .sb-breadcrumb__current {
    overflow: hidden;
    color: var(--sb-text-highlighted);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
