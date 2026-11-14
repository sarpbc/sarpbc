<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { SeasonInput, SeasonSummary } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.seasons.title") }];

const columns: TableColumn<SeasonSummary>[] = [
  { accessorKey: "name", header: t("page.seasons.form.name") },
  { accessorKey: "slug", header: t("page.seasons.form.slug") },
  { id: "actions", header: "" },
];

const {
  status,
  data: seasons,
  refresh,
  error,
} = await useLazyAsyncData("admin-seasons", () => getSeasons(), {
  default: (): SeasonSummary[] => [],
  server: false,
});

const isCreateOpen = ref(false);
const isCreating = ref(false);
const seasonToDelete = ref<SeasonSummary | null>(null);

const create = async (input: SeasonInput) => {
  isCreating.value = true;

  try {
    await createSeason(input);
    isCreateOpen.value = false;
    toast.add({ title: t("page.seasons.create.success"), color: "success" });
    await refresh();
  } catch (createError) {
    reportError(createError, t("page.seasons.create.failed"));
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.seasons.create.button')"
        @click="isCreateOpen = true"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">{{ $t("page.seasons.description") }}</p>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.seasons.loading") }}
        </p>

        <LoadError
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.seasons.loadError')"
          @retry="refresh()"
        />

        <div
          v-else-if="seasons.length === 0"
          class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">{{ $t("page.seasons.empty.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.seasons.empty.description") }}</p>
          </div>
          <UButton
            icon="i-fluent-add-24-regular"
            :label="$t('page.seasons.create.button')"
            @click="isCreateOpen = true"
          />
        </div>

        <ClientOnly v-else>
          <UTable :data="seasons" :columns="columns" sticky>
            <template #name-cell="{ row }">
              <ULink :to="localePath(`/seasons/${row.original.id}`)" class="font-medium">
                {{ row.original.name }}
              </ULink>
            </template>
            <template #slug-cell="{ row }">
              <span v-if="row.original.slug" class="font-mono text-sm" translate="no">
                {{ row.original.slug }}
              </span>
              <span v-else class="text-sm text-muted">{{ $t("page.seasons.unpublished") }}</span>
            </template>
            <template #actions-cell="{ row }">
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-fluent-delete-24-regular"
                :aria-label="$t('page.seasons.delete.title')"
                @click="seasonToDelete = row.original"
              />
            </template>
          </UTable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isCreateOpen"
      :title="$t('page.seasons.create.title')"
      :dismissible="!isCreating"
    >
      <template #body>
        <SeasonForm
          :submit-label="$t('page.seasons.create.submit')"
          :loading="isCreating"
          @submit="create"
        />
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:target="seasonToDelete"
      :title="$t('page.seasons.delete.title')"
      :confirm-label="$t('page.seasons.delete.confirmButton')"
      :message="(target) => $t('page.seasons.delete.confirm', { name: target.name })"
      :remove="(target) => deleteSeason(target.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
