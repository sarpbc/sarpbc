<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { Player } from "~/types/player";

const { t } = useI18n();
const localePath = useLocalePath();

const breadcrumbItems = [
  {
    label: t("page.players.title"),
  },
];

const columns: TableColumn<Player>[] = [
  {
    accessorKey: "name",
    header: t("page.players.columns.name"),
  },
  {
    accessorKey: "firstName",
    header: t("page.players.columns.firstName"),
    cell: ({ getValue }) => (getValue() as string) || "-",
  },
  {
    accessorKey: "lastName",
    header: t("page.players.columns.lastName"),
    cell: ({ getValue }) => (getValue() as string) || "-",
  },
  {
    accessorKey: "nationality",
    header: t("page.players.columns.nationality"),
    cell: ({ getValue }) => (getValue() as string) || "-",
  },
];

const players = ref<Player[]>([]);
const total = ref(0);
const limit = 25;
const page = ref(1);
const isCreateModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const playerToDelete = ref<Player | null>(null);
const isDeleting = ref(false);
const isCreating = ref(false);

const newPlayer = ref({
  name: "",
  firstName: "",
  lastName: "",
  nationality: "",
  birthday: "",
  imageUrl: "",
});

const { status, data, refresh } = await useLazyAsyncData(
  () => `admin-players-${page.value}`,
  async () => getAllPlayers({ limit, offset: (page.value - 1) * limit }),
  {
    default: () => ({ players: [], total: 0 }),
    watch: [page],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      players.value = data.value.players;
      total.value = data.value.total;
    }
  },
  { immediate: true },
);

function selectRow(e: Event, row: TableRow<Player>) {
  e.preventDefault();
  navigateTo(localePath(`/players/${row.original.id}`));
}

function openDeleteModal(e: Event, player: Player) {
  e.stopPropagation();
  playerToDelete.value = player;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!playerToDelete.value) return;
  isDeleting.value = true;
  try {
    await deletePlayer(playerToDelete.value.id);
    isDeleteModalOpen.value = false;
    playerToDelete.value = null;
    await refresh();
  } catch (error) {
    console.error("Failed to delete player:", error);
  } finally {
    isDeleting.value = false;
  }
}

function openCreateModal() {
  newPlayer.value = {
    name: "",
    firstName: "",
    lastName: "",
    nationality: "",
    birthday: "",
    imageUrl: "",
  };
  isCreateModalOpen.value = true;
}

async function confirmCreate() {
  if (!newPlayer.value.name) return;
  isCreating.value = true;
  try {
    const body: CreatePlayerDto = { name: newPlayer.value.name };
    if (newPlayer.value.firstName) body.firstName = newPlayer.value.firstName;
    if (newPlayer.value.lastName) body.lastName = newPlayer.value.lastName;
    if (newPlayer.value.nationality) body.nationality = newPlayer.value.nationality;
    if (newPlayer.value.birthday) body.birthday = newPlayer.value.birthday;
    if (newPlayer.value.imageUrl) body.imageUrl = newPlayer.value.imageUrl;
    const created = await createPlayer(body);
    if (created) {
      isCreateModalOpen.value = false;
      navigateTo(localePath(`/players/${created.id}`));
    }
  } catch (error) {
    console.error("Failed to create player:", error);
  } finally {
    isCreating.value = false;
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
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.players.create.title')"
        @click="openCreateModal"
      />
    </template>

    <DashboardContent>
      <ClientOnly>
        <UTable
          :data="players"
          :columns="columns"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
            tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:!bg-transparent',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
            td: 'border-b border-muted',
          }"
          sticky
          :loading="status === 'pending'"
          @select="selectRow"
        >
          <template #actions-cell="{ row }">
            <UButton
              icon="i-fluent-delete-24-regular"
              color="error"
              variant="ghost"
              size="xs"
              @click="(e) => openDeleteModal(e, row.original)"
            />
          </template>
        </UTable>
        <div v-if="total > limit" class="mt-4 flex w-full flex-row justify-between">
          <span class="text-muted">
            {{ t("page.players.playersCount", { count: total }) }}
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
      :title="$t('page.players.create.title')"
      :dismissible="!isCreating"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField :label="$t('page.players.fields.name')" required>
            <UInput v-model="newPlayer.name" class="w-full" autofocus />
          </UFormField>
          <UFormField :label="$t('page.players.fields.firstName')">
            <UInput v-model="newPlayer.firstName" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.fields.lastName')">
            <UInput v-model="newPlayer.lastName" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.fields.nationality')">
            <UInput v-model="newPlayer.nationality" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.fields.birthday')">
            <UInput v-model="newPlayer.birthday" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.fields.imageUrl')">
            <UInput v-model="newPlayer.imageUrl" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.players.create.save')"
          :loading="isCreating"
          :disabled="!newPlayer.name"
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

    <UModal
      v-model:open="isDeleteModalOpen"
      :title="$t('page.players.delete.title')"
      :dismissible="!isDeleting"
    >
      <template #body>
        <p>
          {{
            $t("page.players.delete.confirm", {
              name: playerToDelete?.name,
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.players.delete.confirm_button')"
          :loading="isDeleting"
          @click="confirmDelete"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isDeleting"
          @click="isDeleteModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
