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
  <nav :aria-label="ariaLabel" class="flex h-row w-full items-center justify-center px-2">
    <ul class="flex h-7 items-stretch border border-default px-2 text-xs font-medium">
      <li v-for="item in items" :key="item.label" class="group flex">
        <NuxtLink
          :to="item.to"
          :aria-current="item.active ? 'page' : undefined"
          class="flex items-center px-1 text-muted hover:text-default aria-[current=page]:text-highlighted group-not-first:ps-0 group-not-first:before:me-2 group-not-first:before:font-normal group-not-first:before:text-dimmed group-not-first:before:content-['/']"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
