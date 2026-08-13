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
];

const teams = ref<Team[]>([]);
const total = ref(0);
const limit = 25;
const page = ref(1);
const isCreateModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const teamToDelete = ref<Team | null>(null);
const isDeleting = ref(false);
const isCreating = ref(false);
const isSyncing = ref(false);

const newTeam = ref({
  name: "",
  location: "",
  imageUrl: "",
});

const { status, data, refresh } = await useLazyAsyncData(
  () => `admin-teams-${page.value}`,
  async () => getAllTeams({ limit, offset: (page.value - 1) * limit }),
  {
    default: () => ({ teams: [], total: 0 }) as { teams: Team[]; total: number },
    watch: [page],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      teams.value = data.value.teams;
      total.value = data.value.total;
    }
  },
  { immediate: true },
);

function selectRow(e: Event, row: TableRow<Team>) {
  e.preventDefault();
  navigateTo(localePath(`/teams/${row.original.id}`));
}

function openDeleteModal(e: Event, team: Team) {
  e.stopPropagation();
  teamToDelete.value = team;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!teamToDelete.value) return;
  isDeleting.value = true;
  try {
    await deleteTeam(teamToDelete.value.id);
    isDeleteModalOpen.value = false;
    teamToDelete.value = null;
    await refresh();
  } catch (error) {
    console.error("Failed to delete team:", error);
  } finally {
    isDeleting.value = false;
  }
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
    const body: {
      name: string;
      location?: string;
      imageUrl?: string;
    } = { name: newTeam.value.name };
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

async function updatePage(value: number) {
  page.value = value;
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
          class="cursor-pointer"
          @click="onSyncTeams"
        />
        <UButton
          icon="i-fluent-add-24-regular"
          :label="$t('page.teams.create.title')"
          class="cursor-pointer"
          @click="openCreateModal"
        />
      </div>
    </template>

    <DashboardContent>
      <ClientOnly>
        <UTable
          :data="teams"
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
          <template #actions-cell="{ row }">
            <UButton
              icon="i-fluent-delete-24-regular"
              color="error"
              variant="ghost"
              size="xs"
              class="cursor-pointer"
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
            @update:page="updatePage"
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
          class="cursor-pointer"
          @click="confirmCreate"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isCreating"
          class="cursor-pointer"
          @click="isCreateModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      :title="$t('page.teams.delete.title')"
      :dismissible="!isDeleting"
    >
      <template #body>
        <p>
          {{
            $t("page.teams.delete.confirm", {
              name: teamToDelete?.name,
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.teams.delete.confirm_button')"
          :loading="isDeleting"
          class="cursor-pointer"
          @click="confirmDelete"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isDeleting"
          class="cursor-pointer"
          @click="isDeleteModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
