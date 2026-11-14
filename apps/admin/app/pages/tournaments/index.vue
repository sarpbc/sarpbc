<script lang="ts" setup>
import { getApiErrorMessage, tournamentStageLabel } from "@sarpbc/utils";
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { TournamentListItem } from "@sarpbc/types";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const isSyncingAdditions = ref(false);
const { syncingId, iconFor, colorFor, run: runTournamentSync } = useTournamentSyncFeedback();

const {
  items: tournaments,
  total,
  page,
  limit,
  status,
  error,
  refresh,
} = useAdminList("admin-tournaments-list", async (range) => {
  const response = await getAllTournaments(range);

  return { items: response.tournaments, total: response.total };
});

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
  },
]);

const columns: TableColumn<TournamentListItem>[] = [
  {
    id: "name",
    header: t("page.tournaments.columns.name"),
    cell: ({ row }) => tournamentStageLabel(row.original),
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

function isManualTournament(tournament: TournamentListItem): boolean {
  return tournament.source !== "pandascore";
}

function selectRow(e: Event, row: TableRow<TournamentListItem>) {
  e.preventDefault();
  navigateTo(localePath(`/tournaments/${row.original.id}`));
}

async function handleSyncAdditions() {
  isSyncingAdditions.value = true;

  try {
    await syncTournamentAdditions();
    toast.add({ title: t("page.tournaments.syncAdditions"), color: "success" });
    await refresh();
  } catch (syncError) {
    reportError(syncError);
  } finally {
    isSyncingAdditions.value = false;
  }
}

async function handleSyncTournament(e: Event, tournamentId: string) {
  e.stopPropagation();

  try {
    await runTournamentSync(tournamentId, refresh);
  } catch (syncError) {
    reportError(syncError);
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div class="flex flex-row flex-wrap gap-2">
        <UButton
          variant="ghost"
          icon="i-fluent-calendar-ltr-24-regular"
          :label="$t('page.tournaments.events.title')"
          :to="localePath('/tournaments/events')"
        />
        <UButton
          variant="ghost"
          icon="i-fluent-ribbon-24-regular"
          :label="$t('page.tournaments.leagues.title')"
          :to="localePath('/tournaments/leagues')"
        />
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
      <LoadError
        v-if="status === 'error'"
        :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
        @retry="refresh()"
      />
      <ClientOnly v-else>
        <UTable
          :data="tournaments"
          :columns="columns"
          :loading="status === 'pending'"
          sticky
          @select="selectRow"
        >
          <template #empty>
            {{ $t("page.tournaments.noTournaments") }}
          </template>
          <template #source-cell="{ row }">
            <UBadge
              :color="isManualTournament(row.original) ? 'primary' : 'neutral'"
              variant="subtle"
              :label="$t(`page.tournaments.source.${row.original.source}`)"
            />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex flex-row items-center justify-end gap-1">
              <UButton
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
                :icon="iconFor(row.original.id)"
                :color="colorFor(row.original.id)"
                :loading="syncingId === row.original.id"
                :title="$t('page.tournaments.syncTournament')"
                @click="(e) => handleSyncTournament(e, row.original.id)"
              />
            </div>
          </template>
        </UTable>

        <div
          v-if="status !== 'pending' && tournaments.length > 0"
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
            @update:page="page = $event"
          />
        </div>
      </ClientOnly>
    </DashboardContent>
  </NuxtLayout>
</template>
