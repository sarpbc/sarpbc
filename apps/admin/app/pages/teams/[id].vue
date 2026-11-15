<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { ContractRole, Team, TeamContract } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const reportError = useReportError();
const teamId = String(route.params.id);

const dateFormatter = useDateFormatter({ day: "numeric", month: "short", year: "numeric" });

const formatDate = (dateStr: string | null) =>
  dateStr ? dateFormatter.value.format(new Date(dateStr)) : "-";

const isSavingTeam = ref(false);

const teamForm = ref({
  imageUrl: "",
  location: "",
  name: "",
});

const {
  data: team,
  status,
  error,
  refresh,
} = await useLazyAsyncData(`admin-team-${teamId}`, () => getTeamById(teamId), {
  server: false,
});

const breadcrumbItems = computed(() => [
  {
    label: t("page.teams.title"),
    to: localePath("/teams"),
  },
  {
    label: team.value?.name ?? teamId,
  },
]);

watch(
  team,
  (p) => {
    if (p) {
      teamForm.value = {
        imageUrl: p.imageUrl ?? "",
        location: p.location ?? "",
        name: p.name ?? "",
      };
    }
  },
  { immediate: true },
);

const saveTeam = async () => {
  if (!teamForm.value.name) {
    return;
  }

  isSavingTeam.value = true;

  try {
    const body: UpdateTeamDto = { name: teamForm.value.name };

    if (teamForm.value.location) {
      body.location = teamForm.value.location;
    }

    if (teamForm.value.imageUrl) {
      body.imageUrl = teamForm.value.imageUrl;
    }

    team.value = await updateTeam(teamId, body);
  } catch (saveError) {
    reportError(saveError);
  } finally {
    isSavingTeam.value = false;
  }
};

const teamToDelete = ref<Team | null>(null);

const isContractModalOpen = ref(false);
const contractToDelete = ref<TeamContract | null>(null);
const isSavingContract = ref(false);
const editingContract = ref<TeamContract | null>(null);

const contractRoleOptions = useContractRoleOptions();

const contractForm = ref<{
  playerId: string;
  role: ContractRole;
  startDate: string;
  endDate: string;
}>({
  endDate: "",
  playerId: "",
  role: "active",
  startDate: "",
});

const contractColumns: TableColumn<TeamContract>[] = [
  {
    accessorKey: "player",
    cell: ({ row }) => row.original.player.name,
    header: t("page.teams.contracts.columns.player"),
  },
  {
    accessorKey: "role",
    cell: ({ row }) => t(`common.contractRole.${row.original.role}`),
    header: t("page.teams.contracts.columns.role"),
  },
  {
    accessorKey: "startDate",
    cell: ({ row }) => formatDate(row.original.startDate),
    header: t("page.teams.contracts.columns.startDate"),
  },
  {
    accessorKey: "endDate",
    cell: ({ row }) => formatDate(row.original.endDate),
    header: t("page.teams.contracts.columns.endDate"),
  },
  { header: "", id: "actions" },
];

const {
  data: contracts,
  error: contractsError,
  refresh: refreshContracts,
} = await useLazyAsyncData(`admin-team-contracts-${teamId}`, () => getTeamContracts(teamId), {
  default: () => [],
  server: false,
});

const openCreateContractModal = () => {
  editingContract.value = null;
  contractForm.value = {
    endDate: "",
    playerId: "",
    role: "active",
    startDate: "",
  };
  isContractModalOpen.value = true;
};

const openEditContractModal = (contract: TeamContract) => {
  editingContract.value = contract;
  contractForm.value = {
    endDate: formatDateForInput(contract.endDate),
    playerId: contract.player.id,
    role: contract.role,
    startDate: formatDateForInput(contract.startDate),
  };
  isContractModalOpen.value = true;
};

const saveContract = async () => {
  if (!contractForm.value.playerId || !contractForm.value.startDate) {
    return;
  }

  isSavingContract.value = true;

  try {
    const body = {
      endDate: contractForm.value.endDate || null,
      playerId: contractForm.value.playerId,
      role: contractForm.value.role,
      startDate: contractForm.value.startDate,
    };

    await (editingContract.value
      ? updateTeamContract(teamId, editingContract.value.id, body)
      : createTeamContract(teamId, body));

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
    ? t("page.teams.contracts.edit.title")
    : t("page.teams.contracts.create.title"),
);
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div v-if="team" class="flex flex-row gap-2">
        <SbButton
          v-if="team.source !== 'pandascore'"
          icon="i-fluent-delete-24-regular"
          variant="secondary"
          danger
          :label="$t('page.teams.delete.title')"
          @click="teamToDelete = team"
        />
        <SbButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.teams.save')"
          :loading="isSavingTeam"
          :disabled="!teamForm.name"
          @click="saveTeam"
        />
      </div>
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
            {{ $t("page.teams.info.title") }}
          </h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SbFormField :label="$t('page.teams.fields.name')" required>
              <SbInput v-model="teamForm.name" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.teams.fields.location')">
              <SbInput v-model="teamForm.location" class="w-full" />
            </SbFormField>
            <SbFormField :label="$t('page.teams.fields.imageUrl')">
              <SbInput v-model="teamForm.imageUrl" class="w-full" />
            </SbFormField>
          </div>
        </div>

        <TeamAliases v-if="team" :team-id="teamId" :aliases="team.aliases" @changed="refresh()" />

        <div>
          <div class="mb-3 flex flex-row items-center justify-between">
            <h2 class="text-base font-semibold">
              {{ $t("page.teams.contracts.title") }}
            </h2>
            <SbButton
              icon="i-fluent-add-24-regular"
              size="sm"
              :label="$t('page.teams.contracts.create.title')"
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
              {{ $t("page.teams.contracts.empty") }}
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
          <SbFormField :label="$t('page.teams.contracts.fields.playerId')" required>
            <SbInput v-model="contractForm.playerId" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.teams.contracts.fields.role')" required>
            <USelect v-model="contractForm.role" :items="contractRoleOptions" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.teams.contracts.fields.startDate')" required>
            <SbInput v-model="contractForm.startDate" type="date" class="w-full" />
          </SbFormField>
          <SbFormField :label="$t('page.teams.contracts.fields.endDate')">
            <SbInput v-model="contractForm.endDate" type="date" class="w-full" />
          </SbFormField>
        </div>
      </template>
      <template #footer>
        <SbButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.teams.contracts.save')"
          :loading="isSavingContract"
          :disabled="!contractForm.playerId || !contractForm.startDate"
          @click="saveContract"
        />
        <SbButton
          variant="secondary"
          :label="$t('common.cancel')"
          :disabled="isSavingContract"
          @click="isContractModalOpen = false"
        />
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:target="teamToDelete"
      :title="$t('page.teams.delete.title')"
      :confirm-label="$t('page.teams.delete.confirm_button')"
      :message="(target) => $t('page.teams.delete.confirm', { name: target.name })"
      :remove="(target) => deleteTeam(target.id)"
      @deleted="navigateTo(localePath('/teams'))"
    />

    <ConfirmDeleteModal
      v-model:target="contractToDelete"
      :title="$t('page.teams.contracts.delete.title')"
      :confirm-label="$t('page.teams.contracts.delete.confirm_button')"
      :message="
        (contract) => $t('page.teams.contracts.delete.confirm', { player: contract.player.name })
      "
      :remove="(contract) => deleteTeamContract(teamId, contract.id)"
      @deleted="refreshContracts"
    />
  </NuxtLayout>
</template>
