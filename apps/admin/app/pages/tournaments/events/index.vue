<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { ManualEvent } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();

const { data, status, error, refresh } = await useLazyAsyncData(
  "admin-manual-events",
  () => getManualEvents(),
  { server: false, default: () => [] },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.events.title") },
]);

const formatDate = (date: string | null): string =>
  date ? new Date(date).toLocaleDateString() : "-";

const columns: TableColumn<ManualEvent>[] = [
  { accessorKey: "name", header: t("page.tournaments.events.columns.name") },
  { accessorKey: "slug", header: t("page.tournaments.form.slug") },
  {
    id: "league",
    header: t("page.tournaments.form.league"),
    cell: ({ row }) => row.original.league?.name ?? "-",
  },
  { id: "stages", header: t("page.tournaments.events.columns.stages") },
  {
    id: "beginAt",
    header: t("page.tournaments.columns.beginAt"),
    cell: ({ row }) => formatDate(row.original.beginAt),
  },
];

const selectRow = (e: Event, row: TableRow<ManualEvent>) => {
  e.preventDefault();
  navigateTo(localePath(`/tournaments/events/${row.original.id}`));
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.tournaments.events.create.action')"
        :to="localePath('/tournaments/events/create')"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="max-w-2xl text-sm text-muted">{{ $t("page.tournaments.events.subtitle") }}</p>

        <LoadError
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.tournaments.events.loadError')"
          @retry="refresh()"
        />

        <ClientOnly v-else>
          <UTable
            :data="data"
            :columns="columns"
            :loading="status === 'pending'"
            sticky
            @select="selectRow"
          >
            <template #empty>
              {{ $t("page.tournaments.events.empty") }}
            </template>
            <template #stages-cell="{ row }">
              <span v-if="row.original.stages.length === 0" class="text-muted">
                {{ $t("page.tournaments.events.noStages") }}
              </span>
              <span v-else>{{ row.original.stages.map((stage) => stage.name).join(", ") }}</span>
            </template>
          </UTable>
        </ClientOnly>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
