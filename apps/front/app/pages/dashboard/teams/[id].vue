<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { Team } from "~/types/team";
import type { ContractRole, TeamContract } from "~/types/contract";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const teamId = route.params.id as string;

const df = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return df.format(new Date(dateStr));
};

// Team data
const team = ref<Team | null>(null);
const isSavingTeam = ref(false);

const teamForm = ref({
  name: "",
  location: "",
  imageUrl: "",
});

const breadcrumbItems = computed(() => [
  {
    label: t("page.dashboard.teams.title"),
    to: localePath("/dashboard/teams"),
  },
  {
    label: team.value?.name ?? teamId,
  },
]);

const { data: teamData } = await useAsyncData(`dashboard-team-${teamId}`, () =>
  getTeamById(teamId),
);

watch(
  teamData,
  (p) => {
    if (p) {
      team.value = p;
      teamForm.value = {
        name: p.name ?? "",
        location: p.location ?? "",
        imageUrl: p.imageUrl ?? "",
      };
    }
  },
  { immediate: true },
);

async function saveTeam() {
  if (!teamForm.value.name) return;
  isSavingTeam.value = true;
  try {
    const body: {
      name: string;
      location?: string;
      imageUrl?: string;
    } = { name: teamForm.value.name };
    if (teamForm.value.location) body.location = teamForm.value.location;
    if (teamForm.value.imageUrl) body.imageUrl = teamForm.value.imageUrl;
    const updated = await updateTeam(teamId, body);
    if (updated) {
      team.value = updated;
    }
  } catch (error) {
    console.error("Failed to save team:", error);
  } finally {
    isSavingTeam.value = false;
  }
}

// Contracts
const contracts = ref<TeamContract[]>([]);
const isContractModalOpen = ref(false);
const isDeleteContractModalOpen = ref(false);
const contractToDelete = ref<TeamContract | null>(null);
const isDeletingContract = ref(false);
const isSavingContract = ref(false);
const editingContract = ref<TeamContract | null>(null);

const contractRoleOptions: { label: string; value: ContractRole }[] = [
  { label: t("common.contractRole.active"), value: "active" },
  { label: t("common.contractRole.benched"), value: "benched" },
  { label: t("common.contractRole.loaned"), value: "loaned" },
];

const contractForm = ref<{
  playerId: string;
  role: ContractRole;
  startDate: string;
  endDate: string;
}>({
  playerId: "",
  role: "active",
  startDate: "",
  endDate: "",
});

const contractColumns: TableColumn<TeamContract>[] = [
  {
    accessorKey: "player",
    header: t("page.dashboard.teams.contracts.columns.player"),
    cell: ({ getValue }) => (getValue() as TeamContract["player"]).name,
  },
  {
    accessorKey: "role",
    header: t("page.dashboard.teams.contracts.columns.role"),
    cell: ({ getValue }) => t(`common.contractRole.${getValue() as ContractRole}`),
  },
  {
    accessorKey: "startDate",
    header: t("page.dashboard.teams.contracts.columns.startDate"),
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
  {
    accessorKey: "endDate",
    header: t("page.dashboard.teams.contracts.columns.endDate"),
    cell: ({ getValue }) => formatDate(getValue() as string | null),
  },
];

const formatDateForInput = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().substring(0, 10);
};

const { data: contractsData, refresh: refreshContracts } = await useAsyncData(
  `dashboard-team-contracts-${teamId}`,
  () => getTeamContracts(teamId),
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
    playerId: "",
    role: "active",
    startDate: "",
    endDate: "",
  };
  isContractModalOpen.value = true;
}

function openEditContractModal(contract: TeamContract) {
  editingContract.value = contract;
  contractForm.value = {
    playerId: contract.player.id,
    role: contract.role,
    startDate: formatDateForInput(contract.startDate),
    endDate: formatDateForInput(contract.endDate),
  };
  isContractModalOpen.value = true;
}

async function saveContract() {
  if (!contractForm.value.playerId || !contractForm.value.startDate) return;
  isSavingContract.value = true;
  try {
    const body = {
      playerId: contractForm.value.playerId,
      role: contractForm.value.role,
      startDate: contractForm.value.startDate,
      endDate: contractForm.value.endDate || null,
    };
    if (editingContract.value) {
      await updateTeamContract(teamId, editingContract.value.id, body);
    } else {
      await createTeamContract(teamId, body);
    }
    isContractModalOpen.value = false;
    await refreshContracts();
  } catch (error) {
    console.error("Failed to save contract:", error);
  } finally {
    isSavingContract.value = false;
  }
}

function openDeleteContractModal(contract: TeamContract) {
  contractToDelete.value = contract;
  isDeleteContractModalOpen.value = true;
}

async function confirmDeleteContract() {
  if (!contractToDelete.value) return;
  isDeletingContract.value = true;
  try {
    await deleteTeamContract(teamId, contractToDelete.value.id);
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
    ? t("page.dashboard.teams.contracts.edit.title")
    : t("page.dashboard.teams.contracts.create.title"),
);
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-save-24-regular"
        :label="$t('page.dashboard.teams.save')"
        :loading="isSavingTeam"
        :disabled="!teamForm.name"
        class="cursor-pointer"
        @click="saveTeam"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <!-- Team info form -->
        <div>
          <h2 class="text-base font-semibold mb-3">
            {{ $t("page.dashboard.teams.info.title") }}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="$t('page.dashboard.teams.fields.name')" required>
              <UInput v-model="teamForm.name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.dashboard.teams.fields.location')">
              <UInput v-model="teamForm.location" class="w-full" />
            </UFormField>
            <UFormField :label="$t('page.dashboard.teams.fields.imageUrl')">
              <UInput v-model="teamForm.imageUrl" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Contracts section -->
        <div>
          <div class="flex flex-row justify-between items-center mb-3">
            <h2 class="text-base font-semibold">
              {{ $t("page.dashboard.teams.contracts.title") }}
            </h2>
            <UButton
              icon="i-fluent-add-24-regular"
              size="sm"
              :label="$t('page.dashboard.teams.contracts.create.title')"
              class="cursor-pointer"
              @click="openCreateContractModal"
            />
          </div>

          <UTable
            :data="contracts"
            :columns="contractColumns"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
              td: 'border-b border-muted',
            }"
          >
            <template #actions-cell="{ row }">
              <div class="flex flex-row gap-1">
                <UButton
                  icon="i-fluent-edit-24-regular"
                  variant="ghost"
                  size="xs"
                  class="cursor-pointer"
                  @click="openEditContractModal(row.original)"
                />
                <UButton
                  icon="i-fluent-delete-24-regular"
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="cursor-pointer"
                  @click="openDeleteContractModal(row.original)"
                />
              </div>
            </template>
          </UTable>

          <p v-if="contracts.length === 0" class="text-muted text-sm mt-2">
            {{ $t("page.dashboard.teams.contracts.empty") }}
          </p>
        </div>
      </div>
    </DashboardContent>

    <!-- Contract create/edit modal -->
    <UModal
      v-model:open="isContractModalOpen"
      :title="contractModalTitle"
      :dismissible="!isSavingContract"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField :label="$t('page.dashboard.teams.contracts.fields.playerId')" required>
            <UInput v-model="contractForm.playerId" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.dashboard.teams.contracts.fields.role')" required>
            <USelect
              v-model="contractForm.role"
              :options="contractRoleOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('page.dashboard.teams.contracts.fields.startDate')" required>
            <UInput v-model="contractForm.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="$t('page.dashboard.teams.contracts.fields.endDate')">
            <UInput v-model="contractForm.endDate" type="date" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.dashboard.teams.contracts.save')"
          :loading="isSavingContract"
          :disabled="!contractForm.playerId || !contractForm.startDate"
          class="cursor-pointer"
          @click="saveContract"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isSavingContract"
          class="cursor-pointer"
          @click="isContractModalOpen = false"
        />
      </template>
    </UModal>

    <!-- Delete contract confirmation -->
    <UModal
      v-model:open="isDeleteContractModalOpen"
      :title="$t('page.dashboard.teams.contracts.delete.title')"
      :dismissible="!isDeletingContract"
    >
      <template #body>
        <p>
          {{
            $t("page.dashboard.teams.contracts.delete.confirm", {
              player: contractToDelete?.player.name,
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.dashboard.teams.contracts.delete.confirm_button')"
          :loading="isDeletingContract"
          class="cursor-pointer"
          @click="confirmDeleteContract"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isDeletingContract"
          class="cursor-pointer"
          @click="isDeleteContractModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
