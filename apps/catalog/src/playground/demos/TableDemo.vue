<script setup lang="ts">
import { Table } from "@sarpbc/design";

import type { TableColumn } from "@sarpbc/design";

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
  { accessorKey: "name", header: "Team" },
  { accessorKey: "region", header: "Region" },
  { accessorKey: "titles", header: "Titles" },
];
</script>

<template>
  <Table :columns="columns" :data="rows" style="width: 24rem" />
</template>
