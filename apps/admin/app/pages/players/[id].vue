<script lang="ts" setup>
import type { TableColumn } from "@sarpbc/design";
import type { ContractRole, PlayerContract } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const reportError = useReportError();
const playerId = String(route.params.id);

const dateFormatter = useDateFormatter({ day: "numeric", month: "short", year: "numeric" });

const formatDate = (dateStr: string | null) =>
  dateStr ? dateFormatter.value.format(new Date(dateStr)) : "-";

const isSavingPlayer = ref(false);

const playerForm = ref({
  birthday: "",
  firstName: "",
  imageUrl: "",
  lastName: "",
  name: "",
  nationality: "",
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
        birthday: formatDateForInput(p.birthday),
        firstName: p.firstName ?? "",
        imageUrl: p.imageUrl ?? "",
        lastName: p.lastName ?? "",
        name: p.name ?? "",
        nationality: p.nationality ?? "",
      };
    }
  },
  { immediate: true },
);

const savePlayer = async () => {
  if (!playerForm.value.name) {
    return;
  }

  isSavingPlayer.value = true;

  try {
    const body: UpdatePlayerDto = { name: playerForm.value.name };

    if (playerForm.value.firstName) {
      body.firstName = playerForm.value.firstName;
    }

    if (playerForm.value.lastName) {
      body.lastName = playerForm.value.lastName;
    }

    if (playerForm.value.nationality) {
      body.nationality = playerForm.value.nationality;
    }

    if (playerForm.value.birthday) {
      body.birthday = playerForm.value.birthday;
    }

    if (playerForm.value.imageUrl) {
      body.imageUrl = playerForm.value.imageUrl;
    }

    player.value = await updatePlayer(playerId, body);
  } catch (saveError) {
    reportError(saveError);
  } finally {
    isSavingPlayer.value = false;
  }
};

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
  endDate: "",
  role: "active",
  startDate: "",
  teamId: "",
});

const contractColumns: TableColumn<PlayerContract>[] = [
  {
    accessorKey: "team",
    cell: ({ row }) => row.original.team.name,
    header: t("page.players.contracts.columns.team"),
  },
  {
    accessorKey: "role",
    cell: ({ row }) => t(`common.contractRole.${row.original.role}`),
    header: t("page.players.contracts.columns.role"),
  },
  {
    accessorKey: "startDate",
    cell: ({ row }) => formatDate(row.original.startDate),
    header: t("page.players.contracts.columns.startDate"),
  },
  {
    accessorKey: "endDate",
    cell: ({ row }) => formatDate(row.original.endDate),
    header: t("page.players.contracts.columns.endDate"),
  },
  { header: "", id: "actions" },
];

const {
  data: contracts,
  error: contractsError,
  refresh: refreshContracts,
} = await useLazyAsyncData(
  `admin-player-contracts-${playerId}`,
  () => getPlayerContracts(playerId),
  { default: () => [], server: false },
);

const openCreateContractModal = () => {
  editingContract.value = null;
  contractForm.value = {
    endDate: "",
    role: "active",
    startDate: "",
    teamId: "",
  };
  isContractModalOpen.value = true;
};

const openEditContractModal = (contract: PlayerContract) => {
  editingContract.value = contract;
  contractForm.value = {
    endDate: formatDateForInput(contract.endDate),
    role: contract.role,
    startDate: formatDateForInput(contract.startDate),
    teamId: contract.team.id,
  };
  isContractModalOpen.value = true;
};

const saveContract = async () => {
  if (!contractForm.value.teamId || !contractForm.value.startDate) {
    return;
  }

  isSavingContract.value = true;

  try {
    const body = {
      endDate: contractForm.value.endDate || null,
      role: contractForm.value.role,
      startDate: contractForm.value.startDate,
      teamId: contractForm.value.teamId,
    };

    await (editingContract.value
      ? updatePlayerContract(playerId, editingContract.value.id, body)
      : createPlayerContract(playerId, body));

    isContractModalOpen.value = false;
    await refreshContracts();
  } catch (saveError) {
    reportError(saveError);
  } finally {
    isSavingContract.value = false;
  }
};

const contractModalTitle = computed(() =>
  editingContract.value
    ? t("page.players.contracts.edit.title")
    : t("page.players.contracts.create.title"),
);
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SbBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <SbButton
        v-if="player"
        icon="i-fluent-save-24-regular"
        :label="$t('page.players.save')"
        :loading="isSavingPlayer"
        :disabled="!playerForm.name"
        @click="savePlayer"
      />
    </template>

    <DashboardContent>
      <SbErrorState
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
            <SbFormField :label="$t('page.players.fields.name')" required>
              <SbInput v-model="playerForm.name" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.players.fields.firstName')">
              <SbInput v-model="playerForm.firstName" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.players.fields.lastName')">
              <SbInput v-model="playerForm.lastName" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.players.fields.nationality')">
              <SbInput v-model="playerForm.nationality" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.players.fields.birthday')">
              <SbInput v-model="playerForm.birthday" type="date" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.players.fields.imageUrl')">
              <SbInput v-model="playerForm.imageUrl" class="w-full" />
            </SbFormField>
          </div>
        </div>

        <div>
          <div class="mb-3 flex flex-row items-center justify-between">
            <h2 class="text-base font-semibold">
              {{ $t("page.players.contracts.title") }}
            </h2>
            <SbButton
              icon="i-fluent-add-24-regular"
              size="sm"
              :label="$t('page.players.contracts.create.title')"
              @click="openCreateContractModal"
            />
          </div>

          <SbErrorState
            v-if="contractsError"
            :message="getApiErrorMessage(contractsError) ?? $t('common.loadFailed')"
            @retry="refreshContracts()"
          />
          <SbTable v-else :data="contracts" :columns="contractColumns">
            <template #empty>
              {{ $t("page.players.contracts.empty") }}
            </template>
            <template #actions-cell="{ row }">
              <div class="flex flex-row gap-1">
                <SbButton
                  icon="i-fluent-edit-24-regular"
                  variant="tertiary"
                  size="sm"
                  @click="openEditContractModal(row.original)"
                />
                <SbButton
                  icon="i-fluent-delete-24-regular"
                  variant="tertiary"
                  danger
                  size="sm"
                  @click="contractToDelete = row.original"
                />
              </div>
            </template>
          </SbTable>
        </div>
      </div>
    </DashboardContent>

    <SbModal
      v-model:open="isContractModalOpen"
      :title="contractModalTitle"
      :dismissible="!isSavingContract"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <SbFormField :label="$t('page.players.contracts.fields.teamId')" required>
            <SbInput v-model="contractForm.teamId" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.players.contracts.fields.role')" required>
            <SbSelect v-model="contractForm.role" :items="contractRoleOptions" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.players.contracts.fields.startDate')" required>
            <SbInput v-model="contractForm.startDate" type="date" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.players.contracts.fields.endDate')">
            <SbInput v-model="contractForm.endDate" type="date" class="w-full" />
          </SbFormField>
        </div>
      </template>
      <template #footer>
        <SbButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.players.contracts.save')"
          :loading="isSavingContract"
          :disabled="!contractForm.teamId || !contractForm.startDate"
          @click="saveContract"
        />
        <SbButton
          variant="secondary"
          :label="$t('common.cancel')"
          :disabled="isSavingContract"
          @click="isContractModalOpen = false"
        />
      </template>
    </SbModal>

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
