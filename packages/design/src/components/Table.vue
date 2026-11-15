<script setup lang="ts" generic="T">
import { FlexRender, getCoreRowModel, useVueTable } from "@tanstack/vue-table";

import type { TableColumn, TableRow } from "../types.ts";
import type { VNode } from "vue";

import Spinner from "./Spinner.vue";

const {
  columns,
  data,
  loading = false,
  onSelect = null,
  sticky = false,
} = defineProps<{
  columns: TableColumn<T>[];
  data: readonly T[];
  loading?: boolean;
  /** Makes rows clickable (`@select`). */
  onSelect?: ((event: MouseEvent, row: TableRow<T>) => void) | null;
  /** Keeps the header visible while the rows scroll. */
  sticky?: boolean;
}>();

/* Slots are named after the column id: `#name-cell`, `#actions-cell`. */
defineSlots<
  Record<`${string}-cell`, (props: { row: TableRow<T> }) => VNode[]> & {
    empty?: () => VNode[];
  }
>();

const table = useVueTable({
  get columns() {
    return columns;
  },
  get data() {
    return [...data];
  },
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
  <div class="sb-table" :data-sticky="sticky || undefined">
    <table class="sb-table__base">
      <thead class="sb-table__head" :data-loading="loading || undefined">
        <tr v-for="group in table.getHeaderGroups()" :key="group.id">
          <th v-for="header in group.headers" :key="header.id" class="sb-table__th">
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          class="sb-table__row"
          :data-selectable="onSelect !== null || undefined"
          @click="onSelect?.($event, row)"
        >
          <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="sb-table__td">
            <slot :name="`${cell.column.id}-cell`" :row="row">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </slot>
          </td>
        </tr>
        <tr v-if="table.getRowModel().rows.length === 0">
          <td :colspan="columns.length" class="sb-table__empty">
            <Spinner v-if="loading" class="sb-table__spinner" />
            <slot v-else name="empty" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
@layer components {
  .sb-table {
    position: relative;
    overflow: auto;
  }

  .sb-table__base {
    min-width: 100%;
    border-collapse: collapse;
  }

  .sb-table[data-sticky] .sb-table__head {
    position: sticky;
    z-index: 1;
    top: 0;
    background: color-mix(in oklab, var(--sb-bg) 75%, transparent);
    backdrop-filter: blur(4px);
  }

  .sb-table__head[data-loading]::after {
    position: absolute;
    inset-inline: 0;
    height: 1px;
    background: var(--sb-primary);
    content: "";
    animation: sb-pulse 1.5s ease-in-out infinite;
  }

  .sb-table__th,
  .sb-table__td {
    height: 2.75rem;
    padding: 0 0.75rem;
    border-bottom: 1px solid var(--sb-border);
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: start;
    white-space: nowrap;
  }

  .sb-table__th {
    color: var(--sb-text-highlighted);
    font-weight: 600;
  }

  .sb-table__td {
    color: var(--sb-text-muted);
  }

  .sb-table__row:last-child > .sb-table__td {
    border-bottom: 0;
  }

  .sb-table__row[data-selectable] {
    cursor: pointer;
  }

  @media (hover: hover) {
    .sb-table__row[data-selectable]:hover {
      background: color-mix(in oklab, var(--sb-bg-elevated) 50%, transparent);
    }
  }

  .sb-table__empty {
    padding: 2rem 0;
    color: var(--sb-text-muted);
    font-size: 0.875rem;
    text-align: center;
  }

  .sb-table__spinner {
    width: 1.25rem;
    height: 1.25rem;
  }
}
</style>
