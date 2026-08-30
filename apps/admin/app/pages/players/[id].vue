<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { ContractRole, PlayerContract } from "~/types/contract";
import type { Player } from "~/types/player";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const playerId = route.params.id as string;

const df = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return df.format(new Date(dateStr));
};

const player = ref<Player | null>(null);
const isSavingPlayer = ref(false);

const playerForm = ref({
  name: "",
  firstName: "",
  lastName: "",
  nationality: "",
  birthday: "",
  imageUrl: "",
});

const breadcrumbItems = computed(() => [
  {
    label: t("page.players.title"),
    to: localePath("/players"),
  },
  {
    label: player.value?.name ?? playerId,
  },
]);

const formatDateForInput = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().substring(0, 10);
};

const { data: playerData } = await useLazyAsyncData(
  `admin-player-${playerId}`,
  () => getPlayerById(playerId),
  { server: false },
);

watch(
  playerData,
  (p) => {
    if (p) {
      player.value = p;
      playerForm.value = {
        name: p.name ?? "",
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        nationality: p.nationality ?? "",
        birthday: formatDateForInput(p.birthday),
        imageUrl: p.imageUrl ?? "",
      };
    }
  },
  { immediate: true },
);

async function savePlayer() {
  if (!playerForm.value.name) return;
  isSavingPlayer.value = true;
  try {
    const body: UpdatePlayerDto = { name: playerForm.value.name };
    if (playerForm.value.firstName) body.firstName = playerForm.value.firstName;
    if (playerForm.value.lastName) body.lastName = playerForm.value.lastName;
    if (playerForm.value.nationality) body.nationality = playerForm.value.nationality;
    if (playerForm.value.birthday) body.birthday = playerForm.value.birthday;
    if (playerForm.value.imageUrl) body.imageUrl = playerForm.value.imageUrl;
    const updated = await updatePlayer(playerId, body);
    if (updated) {
      player.value = updated;
    }
  } catch (error) {
    console.error("Failed to save player:", error);
  } finally {
    isSavingPlayer.value = false;
  }
}

const contracts = ref<PlayerContract[]>([]);
const isContractModalOpen = ref(false);
const isDeleteContractModalOpen = ref(false);
const contractToDelete = ref<PlayerContract | null>(null);
const isDeletingContract = ref(false);
const isSavingContract = ref(false);
const editingContract = ref<PlayerContract | null>(null);

const contractRoleOptions: { label: string; value: ContractRole }[] = [
  { label: t("common.contractRole.active"), value: "active" },
  { label: t("common.contractRole.benched"), value: "benched" },
  { label: t("common.contractRole.loaned"), value: "loaned" },
];

const contractForm = ref<{
  teamId: string;
  role: ContractRole;
  startDate: string;
  endDate: string;
}>({
  teamId: "",
  role: "active",
  startDate: "",
  endDate: "",
});

const contractColumns: TableColumn<PlayerContract>[] = [
  {
    accessorKey: "team",
    header: t("page.players.contracts.columns.team"),
    cell: ({ getValue }) => (getValue() as PlayerContract["team"]).name,
  },
  {
    accessorKey: "role",
    header: t("page.players.contracts.columns.role"),
    cell: ({ getValue }) => t(`common.contractRole.${getValue() as ContractRole}`),
  },
  {
    accessorKey: "startDate",
    header: t("page.players.contracts.columns.startDate"),
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  {
    accessorKey: "endDate",
    header: t("page.players.contracts.columns.endDate"),
    cell: ({ getValue }) => formatDate(getValue() as string | null),
  },
];

const { data: contractsData, refresh: refreshContracts } = await useLazyAsyncData(
  `admin-player-contracts-${playerId}`,
  () => getPlayerContracts(playerId),
  { server: false },
);

watch(
  contractsData,
  (c) => {
    if (c) contracts.value = c;
  },
  { immediate: true },
);

function openCreateContractModal() {
  editingContract.value = null;
  contractForm.value = {
    teamId: "",
    role: "active",
    startDate: "",
    endDate: "",
  };
  isContractModalOpen.value = true;
}

function openEditContractModal(contract: PlayerContract) {
  editingContract.value = contract;
  contractForm.value = {
    teamId: contract.team.id,
    role: contract.role,
    startDate: formatDateForInput(contract.startDate),
    endDate: formatDateForInput(contract.endDate),
  };
  isContractModalOpen.value = true;
}

async function saveContract() {
  if (!contractForm.value.teamId || !contractForm.value.startDate) return;
  isSavingContract.value = true;
  try {
    const body = {
      teamId: contractForm.value.teamId,
      role: contractForm.value.role,
      startDate: contractForm.value.startDate,
      endDate: contractForm.value.endDate || null,
    };
    if (editingContract.value) {
      await updatePlayerContract(playerId, editingContract.value.id, body);
    } else {
      await createPlayerContract(playerId, body);
    }
    isContractModalOpen.value = false;
    await refreshContracts();
  } catch (error) {
    console.error("Failed to save contract:", error);
  } finally {
    isSavingContract.value = false;
  }
}

function openDeleteContractModal(contract: PlayerContract) {
  contractToDelete.value = contract;
  isDeleteContractModalOpen.value = true;
}

async function confirmDeleteContract() {
  if (!contractToDelete.value) return;
  isDeletingContract.value = true;
  try {
    await deletePlayerContract(playerId, contractToDelete.value.id);
    isDeleteContractModalOpen.value = false;
    contractToDelete.value = null;
    await refreshContracts();
  } catch (error) {
    console.error("Failed to delete contract:", error);
  } finally {
    isDeletingContract.value = false;
  }
}

const contractModalTitle = computed(() =>
  editingContract.value
    ? t("page.players.contracts.edit.title")
    : t("page.players.contracts.create.title"),
);
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-save-24-regular"
        :label="$t('page.players.save')"
        :loading="isSavingPlayer"
        :disabled="!playerForm.name"
        @click="savePlayer"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <div>
          <h2 class="mb-3 text-base font-semibold">
            {{ $t("page.players.info.title") }}
          </h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('page.players.fields.name')" required>
              <UInput v-model="playerForm.name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.players.fields.firstName')">
              <UInput v-model="playerForm.firstName" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.players.fields.lastName')">
              <UInput v-model="playerForm.lastName" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.players.fields.nationality')">
              <UInput v-model="playerForm.nationality" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.players.fields.birthday')">
              <UInput v-model="playerForm.birthday" type="date" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.players.fields.imageUrl')">
              <UInput v-model="playerForm.imageUrl" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div>
          <div class="mb-3 flex flex-row items-center justify-between">
            <h2 class="text-base font-semibold">
              {{ $t("page.players.contracts.title") }}
            </h2>
            <UButton
              icon="i-fluent-add-24-regular"
              size="sm"
              :label="$t('page.players.contracts.create.title')"
              @click="openCreateContractModal"
            />
          </div>

          <UTable :data="contracts" :columns="contractColumns">
            <template #empty>
              {{ $t("page.players.contracts.empty") }}
            </template>
            <template #actions-cell="{ row }">
              <div class="flex flex-row gap-1">
                <UButton
                  icon="i-fluent-edit-24-regular"
                  variant="ghost"
                  size="xs"
                  @click="openEditContractModal(row.original)"
                />
                <UButton
                  icon="i-fluent-delete-24-regular"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="openDeleteContractModal(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isContractModalOpen"
      :title="contractModalTitle"
      :dismissible="!isSavingContract"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField :label="$t('page.players.contracts.fields.teamId')" required>
            <UInput v-model="contractForm.teamId" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.contracts.fields.role')" required>
            <USelect
              v-model="contractForm.role"
              :options="contractRoleOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('page.players.contracts.fields.startDate')" required>
            <UInput v-model="contractForm.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.players.contracts.fields.endDate')">
            <UInput v-model="contractForm.endDate" type="date" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.players.contracts.save')"
          :loading="isSavingContract"
          :disabled="!contractForm.teamId || !contractForm.startDate"
          @click="saveContract"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isSavingContract"
          @click="isContractModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteContractModalOpen"
      :title="$t('page.players.contracts.delete.title')"
      :dismissible="!isDeletingContract"
    >
      <template #body>
        <p>
          {{
            $t("page.players.contracts.delete.confirm", {
              team: contractToDelete?.team.name,
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.players.contracts.delete.confirm_button')"
          :loading="isDeletingContract"
          @click="confirmDeleteContract"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isDeletingContract"
          @click="isDeleteContractModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
