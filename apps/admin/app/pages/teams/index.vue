<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { Team } from "~/types/team";

const { t } = useI18n();
const localePath = useLocalePath();

const breadcrumbItems = [
  {
    label: t("page.teams.title"),
  },
];

const columns: TableColumn<Team>[] = [
  {
    accessorKey: "name",
    header: t("page.teams.columns.name"),
  },
  {
    accessorKey: "location",
    header: t("page.teams.columns.location"),
    cell: ({ getValue }) => (getValue() as string) || "-",
  },
  {
    id: "actions",
    header: "",
  },
];

const {
  items: teams,
  total,
  page,
  limit,
  status,
  refresh,
} = useAdminList("admin-teams", async (range) => {
  const { teams, total } = await getAllTeams(range);
  return { items: teams, total };
});
const teamToDelete = ref<Team | null>(null);
const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const isSyncing = ref(false);

const newTeam = ref({
  name: "",
  location: "",
  imageUrl: "",
});

function selectRow(e: Event, row: TableRow<Team>) {
  e.preventDefault();
  navigateTo(localePath(`/teams/${row.original.id}`));
}

function openDeleteModal(e: Event, team: Team) {
  e.stopPropagation();
  teamToDelete.value = team;
}

function openCreateModal() {
  newTeam.value = {
    name: "",
    location: "",
    imageUrl: "",
  };
  isCreateModalOpen.value = true;
}

async function confirmCreate() {
  if (!newTeam.value.name) return;
  isCreating.value = true;
  try {
    const body: CreateTeamDto = { name: newTeam.value.name };
    if (newTeam.value.location) body.location = newTeam.value.location;
    if (newTeam.value.imageUrl) body.imageUrl = newTeam.value.imageUrl;
    const created = await createTeam(body);
    if (created) {
      isCreateModalOpen.value = false;
      navigateTo(localePath(`/teams/${created.id}`));
    }
  } catch (error) {
    console.error("Failed to create team:", error);
  } finally {
    isCreating.value = false;
  }
}

async function onSyncTeams() {
  if (isSyncing.value) {
    return;
  }
  isSyncing.value = true;
  try {
    await syncTeamFromPandascore();
    await refresh();
  } catch (error) {
    console.error("Failed to sync teams:", error);
  } finally {
    isSyncing.value = false;
  }
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
          icon="i-fluent-arrow-sync-24-regular"
          color="neutral"
          variant="outline"
          :label="isSyncing ? $t('page.teams.syncingPandascore') : $t('page.teams.syncPandascore')"
          :loading="isSyncing"
          :disabled="isSyncing"
          @click="onSyncTeams"
        />
        <UButton
          icon="i-fluent-add-24-regular"
          :label="$t('page.teams.create.title')"
          @click="openCreateModal"
        />
      </div>
    </template>

    <DashboardContent>
      <ClientOnly>
        <UTable
          :data="teams"
          :columns="columns"
          :loading="status === 'pending'"
          sticky
          @select="selectRow"
        >
          <template #empty>
            {{ $t("page.teams.empty") }}
          </template>
          <template #actions-cell="{ row }">
            <UButton
              icon="i-fluent-delete-24-regular"
              color="error"
              variant="ghost"
              size="xs"
              :aria-label="$t('page.teams.delete.title')"
              @click="(e) => openDeleteModal(e, row.original)"
            />
          </template>
        </UTable>
        <div v-if="total > limit" class="mt-4 flex w-full flex-row justify-between">
          <span class="text-muted">
            {{ t("page.teams.teamsCount", { count: total }) }}
          </span>
          <UPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="page = $event"
          />
        </div>
      </ClientOnly>
    </DashboardContent>

    <UModal
      v-model:open="isCreateModalOpen"
      :title="$t('page.teams.create.title')"
      :dismissible="!isCreating"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField :label="$t('page.teams.fields.name')" required>
            <UInput v-model="newTeam.name" class="w-full" autofocus />
          </UFormField>
          <UFormField :label="$t('page.teams.fields.location')">
            <UInput v-model="newTeam.location" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.teams.fields.imageUrl')">
            <UInput v-model="newTeam.imageUrl" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.teams.create.save')"
          :loading="isCreating"
          :disabled="!newTeam.name"
          @click="confirmCreate"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isCreating"
          @click="isCreateModalOpen = false"
        />
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:target="teamToDelete"
      :title="$t('page.teams.delete.title')"
      :confirm-label="$t('page.teams.delete.confirm_button')"
      :message="(team) => $t('page.teams.delete.confirm', { name: team.name })"
      :remove="(team) => deleteTeam(team.id)"
      @deleted="refresh"
    />
  </NuxtLayout>
</template>
