<script setup lang="ts">
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from "reka-ui";

import { useDesignAdapters } from "../adapters.ts";

const page = defineModel<number>("page", { required: true });

const { itemsPerPage, total } = defineProps<{
  itemsPerPage: number;
  total: number;
}>();

const adapters = useDesignAdapters();
</script>

<template>
  <PaginationRoot
    v-model:page="page"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="1"
    show-edges
    class="sb-pagination"
    :aria-label="adapters.translate('pagination')"
  >
    <PaginationList v-slot="{ items }" class="sb-pagination__list">
      <PaginationPrev class="sb-pagination__step" :aria-label="adapters.translate('previousPage')">
        <component :is="adapters.icon" name="i-lucide-chevron-left" class="sb-pagination__icon" />
      </PaginationPrev>
      <template v-for="(item, index) in items" :key="index">
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          class="sb-pagination__page"
        >
          {{ item.value }}
        </PaginationListItem>
        <PaginationEllipsis v-else :index="index" class="sb-pagination__ellipsis">
          …
        </PaginationEllipsis>
      </template>
      <PaginationNext class="sb-pagination__step" :aria-label="adapters.translate('nextPage')">
        <component :is="adapters.icon" name="i-lucide-chevron-right" class="sb-pagination__icon" />
      </PaginationNext>
    </PaginationList>
  </PaginationRoot>
</template>

<style scoped>
@layer components {
  .sb-pagination__list {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .sb-pagination__step,
  .sb-pagination__page {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border: 0;
    background: none;
    color: var(--sb-text);
    font: inherit;
    font-size: var(--sb-control-text);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  @media (hover: hover) {
    .sb-pagination__step:hover:enabled,
    .sb-pagination__page:hover:not([data-selected]) {
      background: color-mix(in oklab, var(--sb-bg-elevated) 50%, transparent);
    }
  }

  .sb-pagination__step:focus-visible,
  .sb-pagination__page:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-pagination__page[data-selected] {
    background: var(--sb-bg-elevated);
    color: var(--sb-text-highlighted);
  }

  .sb-pagination__step:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }

  .sb-pagination__ellipsis {
    min-width: 1.75rem;
    color: var(--sb-text-muted);
    text-align: center;
  }

  .sb-pagination__icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
