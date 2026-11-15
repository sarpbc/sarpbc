<script setup lang="ts">
import { Table } from "@sarpbc/design";
import { computed, ref } from "vue";

import type { TableColumn, TableSort } from "@sarpbc/design";

interface Row {
  name: string;
  region: string;
  titles: number;
}

const rows: Row[] = [
  { name: "Karmine Corp", region: "EU", titles: 4 },
  { name: "Team Vitality", region: "EU", titles: 6 },
  { name: "Gentle Mates", region: "EU", titles: 1 },
];

const columns: TableColumn<Row>[] = [
  { accessorKey: "name", header: "Team", meta: { rowHeader: true } },
  { accessorKey: "region", enableSorting: false, header: "Region" },
  { accessorKey: "titles", header: "Titles", meta: { align: "end" }, sortDescFirst: true },
];

const sort = ref<TableSort>({ desc: true, id: "titles" });

/* The table only reports the sort; the page orders its own data. */
const sorted = computed(() =>
  rows.toSorted((a, b) => {
    const order = sort.value.id === "titles" ? a.titles - b.titles : a.name.localeCompare(b.name);

    return sort.value.desc ? -order : order;
  }),
);
</script>

<template>
  <Table
    v-model:sorting="sort"
    caption="Teams by titles"
    :columns="columns"
    :data="sorted"
    style="width: 24rem"
  />
</template>
