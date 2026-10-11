<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

export interface TabNavItem {
  to: RouteLocationRaw;
  label: string;
  active: boolean;
}

const { items, ariaLabel } = defineProps<{
  items: TabNavItem[];
  ariaLabel: string;
}>();
</script>

<template>
  <nav :aria-label="ariaLabel" class="w-full border-t border-default">
    <ul class="flex h-row items-stretch">
      <li v-for="item in items" :key="item.label">
        <NuxtLink
          :to="item.to"
          :aria-current="item.active ? 'page' : undefined"
          class="relative flex h-full items-center px-4 text-sm font-medium text-muted outline-none hover:text-highlighted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset aria-[current=page]:text-highlighted aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-inverted"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
