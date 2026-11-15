<script setup lang="ts" generic="T">
import { FlexRender, getCoreRowModel, useVueTable } from "@tanstack/vue-table";

import { useDesignAdapters } from "../adapters.ts";

import type { TableColumn, TableRow, TableSort } from "../types.ts";
import type { Column, Header } from "@tanstack/vue-table";
import type { VNode } from "vue";

import Spinner from "./Spinner.vue";

const {
  caption = null,
  columns,
  data,
  loading = false,
  onSelect = null,
  sorting = null,
  sticky = false,
} = defineProps<{
  /** Read by screen readers before the table. */
  caption?: string | null;
  columns: TableColumn<T>[];
  /** Passed by reference: TanStack recomputes rows whenever this identity changes. */
  data: T[];
  loading?: boolean;
  /** Makes rows clickable (`@select`). */
  onSelect?: ((event: MouseEvent, row: TableRow<T>) => void) | null;
  /**
   * The current sort, owned by the parent, which also sorts `data`. Setting it
   * makes headers sortable (except columns with `enableSorting: false`).
   */
  sorting?: TableSort | null;
  /** Keeps the header visible while the rows scroll. */
  sticky?: boolean;
}>();

const emit = defineEmits<{ "update:sorting": [sort: TableSort] }>();

/* Slots are named after the column id: `#name-cell`, `#actions-cell`. */
defineSlots<
  Record<`${string}-cell`, (props: { row: TableRow<T> }) => VNode[]> & {
    empty?: () => VNode[];
  }
>();

const adapters = useDesignAdapters();

/* A button, link or field inside a row acts on its own; only the rest of the row selects it. */
const INTERACTIVE = "a, button, input, select, textarea, label, [role='menuitem']";

const selectRow = (event: MouseEvent, row: TableRow<T>): void => {
  if (event.target instanceof Element && event.target.closest(INTERACTIVE) !== null) {
    return;
  }

  onSelect?.(event, row);
};

const isSortable = (header: Header<T, unknown>): boolean =>
  sorting !== null && header.column.columnDef.enableSorting !== false;

const ariaSort = (header: Header<T, unknown>): "ascending" | "descending" | undefined => {
  if (sorting?.id !== header.column.id) {
    return undefined;
  }

  return sorting.desc ? "descending" : "ascending";
};

/* A new column starts in its natural direction (numbers high to low); the same column flips. */
const sortBy = (header: Header<T, unknown>): void => {
  const { id } = header.column;

  const desc =
    sorting?.id === id ? !sorting.desc : (header.column.columnDef.sortDescFirst ?? false);

  emit("update:sorting", { desc, id });
};

const alignOf = (column: Column<T, unknown>): "start" | "end" =>
  column.columnDef.meta?.align ?? "start";

const table = useVueTable({
  get columns() {
    return columns;
  },
  get data() {
    return data;
  },
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
});
</script>

<template>
  <div class="sb-table" :data-sticky="sticky || undefined">
    <table class="sb-table__base">
      <caption v-if="caption !== null" class="sb-table__caption">
        {{ caption }}
      </caption>
      <thead class="sb-table__head" :data-loading="loading || undefined">
        <tr v-for="group in table.getHeaderGroups()" :key="group.id">
          <th
            v-for="header in group.headers"
            :key="header.id"
            scope="col"
            class="sb-table__th"
            :data-align="alignOf(header.column)"
            :aria-sort="ariaSort(header)"
          >
            <button
              v-if="!header.isPlaceholder && isSortable(header)"
              type="button"
              class="sb-table__sort"
              :data-active="sorting?.id === header.column.id || undefined"
              @click="sortBy(header)"
            >
              <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              <component
                :is="adapters.icon"
                v-if="sorting?.id === header.column.id"
                :name="sorting.desc ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
                class="sb-table__sort-icon"
              />
            </button>
            <FlexRender
              v-else-if="!header.isPlaceholder"
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
          @click="selectRow($event, row)"
        >
          <component
            :is="cell.column.columnDef.meta?.rowHeader ? 'th' : 'td'"
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :scope="cell.column.columnDef.meta?.rowHeader ? 'row' : undefined"
            class="sb-table__td"
            :data-align="alignOf(cell.column)"
          >
            <slot :name="`${cell.column.id}-cell`" :row="row">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </slot>
          </component>
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

  .sb-table__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
    /* Each app sets its row rhythm: 52px on the public hubs, 44px in the staff console. */
    height: var(--spacing-row, 2.75rem);
    padding: 0 0.75rem;
    border-bottom: 1px solid var(--sb-border);
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.25rem;
    text-align: start;
    white-space: nowrap;
  }

  .sb-table__th {
    color: var(--sb-text-highlighted);
    font-weight: 500;
  }

  .sb-table__td {
    color: var(--sb-text-muted);
  }

  .sb-table__th[data-align="end"],
  .sb-table__td[data-align="end"] {
    font-variant-numeric: tabular-nums;
    text-align: end;
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

  .sb-table__sort {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .sb-table__th[data-align="end"] .sb-table__sort {
    flex-direction: row-reverse;
  }

  .sb-table__sort:focus-visible {
    outline: 1px solid var(--sb-primary);
    outline-offset: 2px;
  }

  .sb-table__sort-icon {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
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
