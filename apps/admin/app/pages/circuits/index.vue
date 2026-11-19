<script lang="ts" setup>
import type { TableColumn } from "@sarpbc/design";
import type { CircuitInput, CircuitSummary } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.circuits.title") }];

const columns: TableColumn<CircuitSummary>[] = [
  { accessorKey: "name", header: t("page.circuits.form.name") },
  { accessorKey: "slug", header: t("page.circuits.form.slug") },
  {
    cell: ({ row }) => row.original.qualificationSpots ?? "—",
    header: t("page.circuits.form.qualificationSpots"),
    id: "qualificationSpots",
  },
  { header: "", id: "actions" },
];

const {
  status,
  data: circuits,
  refresh,
  error,
} = await useLazyAsyncData("admin-circuits", () => getCircuits(), {
  default: () => [],
  server: false,
});

const isCreateOpen = ref(false);
const isCreating = ref(false);
const circuitToDelete = ref<CircuitSummary | null>(null);

const create = async (input: CircuitInput) => {
  isCreating.value = true;

  try {
    await createCircuit(input);
    isCreateOpen.value = false;
    toast.add({ color: "success", title: t("page.circuits.create.success") });
    await refresh();
  } catch (createError) {
    reportError(createError, t("page.circuits.create.failed"));
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <SButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.circuits.create.button')"
        @click="isCreateOpen = true"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">{{ $t("page.circuits.description") }}</p>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.circuits.loading") }}
        </p>

        <SErrorState
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.circuits.loadError')"
          @retry="refresh()"
        />

        <div
          v-else-if="circuits.length === 0"
          class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">{{ $t("page.circuits.empty.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.circuits.empty.description") }}</p>
          </div>
          <SButton
            icon="i-fluent-add-24-regular"
            :label="$t('page.circuits.create.button')"
            @click="isCreateOpen = true"
          />
        </div>

        <ClientOnly v-else>
          <STable :data="circuits" :columns="columns" sticky>
            <template #name-cell="{ row }">
              <SLink :to="localePath(`/circuits/${row.original.id}`)" class="font-medium">
                {{ row.original.name }}
              </SLink>
            </template>
            <template #actions-cell="{ row }">
              <SButton
                variant="tertiary"
                danger
                size="sm"
                icon="i-fluent-delete-24-regular"
                :aria-label="$t('page.circuits.delete.title')"
                @click="circuitToDelete = row.original"
              />
            </template>
          </STable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <SModal
      v-model:open="isCreateOpen"
      :title="$t('page.circuits.create.title')"
      :dismissible="!isCreating"
    >
      <template #body>
        <CircuitForm
          :submit-label="$t('page.circuits.create.submit')"
          :loading="isCreating"
          @submit="create"
        />
      </template>
    </SModal>

    <ConfirmDeleteModal
      v-model:target="circuitToDelete"
      :title="$t('page.circuits.delete.title')"
      :confirm-label="$t('page.circuits.delete.confirmButton')"
      :message="(target) => $t('page.circuits.delete.confirm', { name: target.name })"
      :remove="(target) => deleteCircuit(target.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
