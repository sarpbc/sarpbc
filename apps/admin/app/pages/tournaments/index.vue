<script lang="ts" setup>
import { getApiErrorMessage, tournamentStageLabel } from "@sarpbc/utils";
import type { TableColumn, TableRow } from "@sarpbc/design";
import type { TournamentListItem } from "@sarpbc/types";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const isSyncingAdditions = ref(false);
const { syncingId, failedFor, iconFor, run: runTournamentSync } = useTournamentSyncFeedback();

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
    cell: ({ row }) => tournamentStageLabel(row.original),
    header: t("page.tournaments.columns.name"),
    id: "name",
  },
  {
    header: t("page.tournaments.columns.source"),
    id: "source",
  },
  {
    cell: ({ row }) =>
      row.original.beginAt ? new Date(row.original.beginAt).toLocaleDateString() : "-",
    header: t("page.tournaments.columns.beginAt"),
    id: "beginAt",
  },
  {
    header: t("page.tournaments.columns.actions"),
    id: "actions",
  },
];

const isManualTournament = (tournament: TournamentListItem) => tournament.source !== "pandascore";

const selectRow = (e: Event, row: TableRow<TournamentListItem>) => {
  e.preventDefault();
  navigateTo(localePath(`/tournaments/${row.original.id}`));
};

const handleSyncAdditions = async () => {
  isSyncingAdditions.value = true;

  try {
    await syncTournamentAdditions();
    toast.add({ color: "success", title: t("page.tournaments.syncAdditions") });
    await refresh();
  } catch (syncError) {
    reportError(syncError);
  } finally {
    isSyncingAdditions.value = false;
  }
};

const handleSyncTournament = async (e: Event, tournamentId: string) => {
  e.stopPropagation();

  try {
    await runTournamentSync(tournamentId, refresh);
  } catch (syncError) {
    reportError(syncError);
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div class="flex flex-row flex-wrap gap-2">
        <SButton
          variant="tertiary"
          icon="i-fluent-calendar-ltr-24-regular"
          :label="$t('page.tournaments.events.title')"
          :to="localePath('/tournaments/events')"
        />
        <SButton
          variant="tertiary"
          icon="i-fluent-ribbon-24-regular"
          :label="$t('page.tournaments.leagues.title')"
          :to="localePath('/tournaments/leagues')"
        />
        <SButton
          variant="secondary"
          icon="i-fluent-add-24-regular"
          :label="$t('page.tournaments.create.action')"
          :to="localePath('/tournaments/create')"
        />
        <SButton
          :loading="isSyncingAdditions"
          icon="i-fluent-arrow-sync-24-regular"
          :label="$t('page.tournaments.syncAdditions')"
          @click="handleSyncAdditions"
        />
      </div>
    </template>

    <DashboardContent>
      <SErrorState
        v-if="status === 'error'"
        :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
        @retry="refresh()"
      />
      <ClientOnly v-else>
        <STable
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
            <SBadge
              :color="isManualTournament(row.original) ? 'info' : 'neutral'"
              :label="$t(`page.tournaments.source.${row.original.source}`)"
            />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex flex-row items-center justify-end gap-1">
              <SButton
                variant="tertiary"
                size="sm"
                icon="i-fluent-edit-24-regular"
                :title="$t('page.tournaments.edit.action')"
                :to="localePath(`/tournaments/${row.original.id}/edit`)"
                @click.stop
              />
              <SButton
                v-if="!isManualTournament(row.original)"
                variant="tertiary"
                size="sm"
                :icon="iconFor(row.original.id)"
                :danger="failedFor(row.original.id)"
                :loading="syncingId === row.original.id"
                :title="$t('page.tournaments.syncTournament')"
                @click="(e) => handleSyncTournament(e, row.original.id)"
              />
            </div>
          </template>
        </STable>

        <div
          v-if="status !== 'pending' && tournaments.length > 0"
          class="mt-4 flex w-full flex-row items-center justify-between gap-4"
        >
          <span class="text-muted">
            {{ t("page.tournaments.tournamentsCount", { count: total }) }}
          </span>
          <SPagination
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
