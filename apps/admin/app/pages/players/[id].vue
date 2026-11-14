<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { ContractRole, PlayerContract } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const reportError = useReportError();
const playerId = String(route.params.id);

const dateFormatter = useDateFormatter({ year: "numeric", month: "short", day: "numeric" });

const formatDate = (dateStr: string | null) =>
  dateStr ? dateFormatter.value.format(new Date(dateStr)) : "-";

const isSavingPlayer = ref(false);

const playerForm = ref({
  name: "",
  firstName: "",
  lastName: "",
  nationality: "",
  birthday: "",
  imageUrl: "",
});

const {
  data: player,
  status,
  error,
  refresh,
} = await useLazyAsyncData(`admin-player-${playerId}`, () => getPlayerById(playerId), {
  server: false,
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

watch(
  player,
  (p) => {
    if (p) {
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
    player.value = await updatePlayer(playerId, body);
  } catch (saveError) {
    reportError(saveError);
  } finally {
    isSavingPlayer.value = false;
  }
}

const isContractModalOpen = ref(false);
const contractToDelete = ref<PlayerContract | null>(null);
const isSavingContract = ref(false);
const editingContract = ref<PlayerContract | null>(null);

const contractRoleOptions = useContractRoleOptions();

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
    cell: ({ row }) => row.original.team.name,
  },
  {
    accessorKey: "role",
    header: t("page.players.contracts.columns.role"),
    cell: ({ row }) => t(`common.contractRole.${row.original.role}`),
  },
  {
    accessorKey: "startDate",
    header: t("page.players.contracts.columns.startDate"),
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: "endDate",
    header: t("page.players.contracts.columns.endDate"),
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  { id: "actions", header: "" },
];

const {
  data: contracts,
  error: contractsError,
  refresh: refreshContracts,
} = await useLazyAsyncData(
  `admin-player-contracts-${playerId}`,
  () => getPlayerContracts(playerId),
  { server: false, default: () => [] },
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
  } catch (saveError) {
    reportError(saveError);
  } finally {
    isSavingContract.value = false;
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
        v-if="player"
        icon="i-fluent-save-24-regular"
        :label="$t('page.players.save')"
        :loading="isSavingPlayer"
        :disabled="!playerForm.name"
        @click="savePlayer"
      />
    </template>

    <DashboardContent>
      <LoadError
        v-if="status === 'error'"
        :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
        @retry="refresh()"
      />

      <div v-else class="flex flex-col gap-6">
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

          <LoadError
            v-if="contractsError"
            :message="getApiErrorMessage(contractsError) ?? $t('common.loadFailed')"
            @retry="refreshContracts()"
          />
          <UTable v-else :data="contracts" :columns="contractColumns">
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
                  @click="contractToDelete = row.original"
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
            <USelect v-model="contractForm.role" :items="contractRoleOptions" class="w-full" />
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

    <ConfirmDeleteModal
      v-model:target="contractToDelete"
      :title="$t('page.players.contracts.delete.title')"
      :confirm-label="$t('page.players.contracts.delete.confirm_button')"
      :message="
        (contract) => $t('page.players.contracts.delete.confirm', { team: contract.team.name })
      "
      :remove="(contract) => deletePlayerContract(playerId, contract.id)"
      @deleted="refreshContracts"
    />
  </NuxtLayout>
</template>
