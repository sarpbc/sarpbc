<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { Tournament } from "~/types/tournament";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const limit = 25;
const page = ref(1);
const isSyncingAdditions = ref(false);
const syncingTournamentId = ref<string | null>(null);

const tournaments = ref<Tournament[]>([]);
const total = ref(0);

const { status, data, refresh } = await useLazyAsyncData(
  () => `admin-tournaments-list-${page.value}`,
  () => getAllTournaments({ limit, offset: (page.value - 1) * limit }),
  {
    default: () => ({ tournaments: [], total: 0 }),
    watch: [page],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      tournaments.value = data.value.tournaments;
      total.value = data.value.total;
    }
  },
  { immediate: true },
);

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
  },
]);

const columns: TableColumn<Tournament>[] = [
  {
    id: "name",
    header: t("page.tournaments.columns.name"),
    cell: ({ row }) => tournamentLabel(row.original),
  },
  {
    id: "source",
    header: t("page.tournaments.columns.source"),
  },
  {
    id: "beginAt",
    header: t("page.tournaments.columns.beginAt"),
    cell: ({ row }) =>
      row.original.beginAt ? new Date(row.original.beginAt).toLocaleDateString() : "-",
  },
  {
    id: "actions",
    header: t("page.tournaments.columns.actions"),
  },
];

function tournamentLabel(tournament: Tournament): string {
  const year = tournament.beginAt
    ? new Date(tournament.beginAt).getFullYear()
    : new Date().getFullYear();
  const league = tournament.league?.name ? `${tournament.league.name} ` : "";
  return `${league}${year} ${tournament.name}`.trim();
}

function isManualTournament(tournament: Tournament): boolean {
  return tournament.source === "manual";
}

function selectRow(e: Event, row: TableRow<Tournament>) {
  e.preventDefault();
  navigateTo(localePath(`/tournaments/${row.original.id}`));
}

async function handleSyncAdditions() {
  isSyncingAdditions.value = true;
  try {
    const success = await syncTournamentAdditions();
    if (success) {
      toast.add({ title: t("page.tournaments.syncAdditions"), color: "success" });
      await refresh();
    }
  } finally {
    isSyncingAdditions.value = false;
  }
}

async function handleSyncTournament(e: Event, tournamentId: string) {
  e.stopPropagation();
  syncingTournamentId.value = tournamentId;
  try {
    const success = await syncTournament(tournamentId);
    if (success) {
      toast.add({ title: t("page.tournaments.syncTournament"), color: "success" });
      await refresh();
    }
  } finally {
    syncingTournamentId.value = null;
  }
}

async function updatePage(value: number) {
  page.value = value;
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div class="flex flex-row gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-add-24-regular"
          :label="$t('page.tournaments.create.action')"
          :to="localePath('/tournaments/create')"
        />
        <UButton
          :loading="isSyncingAdditions"
          icon="i-fluent-arrow-sync-24-regular"
          :label="$t('page.tournaments.syncAdditions')"
          @click="handleSyncAdditions"
        />
      </div>
    </template>

    <DashboardContent>
      <ClientOnly>
        <UTable
          :data="tournaments"
          :columns="columns"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
            tbody:
              '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:cursor-pointer [&>tr]:hover:!bg-transparent',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
            td: 'border-b border-muted',
          }"
          :loading="status === 'pending'"
          sticky
          @select="selectRow"
        >
          <template #source-cell="{ row }">
            <UBadge
              :color="isManualTournament(row.original) ? 'primary' : 'neutral'"
              variant="subtle"
              :label="
                isManualTournament(row.original)
                  ? $t('page.tournaments.source.manual')
                  : $t('page.tournaments.source.pandascore')
              "
            />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex flex-row items-center justify-end gap-1">
              <UButton
                v-if="isManualTournament(row.original)"
                variant="ghost"
                size="xs"
                icon="i-fluent-edit-24-regular"
                :title="$t('page.tournaments.edit.action')"
                :to="localePath(`/tournaments/${row.original.id}/edit`)"
                @click.stop
              />
              <UButton
                v-if="!isManualTournament(row.original)"
                variant="ghost"
                size="xs"
                icon="i-fluent-arrow-sync-24-regular"
                :loading="syncingTournamentId === row.original.id"
                :title="$t('page.tournaments.syncTournament')"
                @click="(e) => handleSyncTournament(e, row.original.id)"
              />
            </div>
          </template>
        </UTable>

        <div
          v-if="status !== 'pending' && tournaments.length === 0"
          class="py-6 text-sm text-muted"
        >
          {{ $t("page.tournaments.noTournaments") }}
        </div>

        <div
          v-else-if="status !== 'pending'"
          class="mt-4 flex w-full flex-row items-center justify-between gap-4"
        >
          <span class="text-muted">
            {{ t("page.tournaments.tournamentsCount", { count: total }) }}
          </span>
          <UPagination
            v-if="total > limit"
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="updatePage"
          />
        </div>
      </ClientOnly>
    </DashboardContent>
  </NuxtLayout>
</template>
