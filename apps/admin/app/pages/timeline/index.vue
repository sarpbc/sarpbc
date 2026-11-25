<script lang="ts" setup>
import type { TableColumn } from "@sarpbc/design";
import type { StaffTimelineEntry, TimelineEntryInput } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t, locale } = useI18n();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.timeline.title") }];

const columns: TableColumn<StaffTimelineEntry>[] = [
  { header: t("page.timeline.table.date"), id: "date" },
  { header: t("page.timeline.table.kind"), id: "kind" },
  { accessorKey: "nameEn", header: t("page.timeline.table.name") },
  { header: "", id: "actions" },
];

const {
  status,
  data: entries,
  refresh,
  error,
} = await useLazyAsyncData("admin-timeline-entries", () => getTimelineEntries(), {
  default: () => [],
  server: false,
});

const dayFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }),
);

const dateLabel = (entry: StaffTimelineEntry) => dayFormat.value.format(new Date(entry.date));

const isFormOpen = ref(false);
const isSaving = ref(false);
const editing = ref<StaffTimelineEntry | null>(null);
const entryToDelete = ref<StaffTimelineEntry | null>(null);

const openCreate = () => {
  editing.value = null;
  isFormOpen.value = true;
};

const openEdit = (entry: StaffTimelineEntry) => {
  editing.value = entry;
  isFormOpen.value = true;
};

const save = async (input: TimelineEntryInput) => {
  isSaving.value = true;
  const current = editing.value;

  try {
    await (current ? updateTimelineEntry(current.id, input) : createTimelineEntry(input));
    isFormOpen.value = false;
    toast.add({
      color: "success",
      title: t(current ? "page.timeline.edit.saved" : "page.timeline.create.success"),
    });
    await refresh();
  } catch (saveError) {
    reportError(
      saveError,
      t(current ? "page.timeline.edit.failed" : "page.timeline.create.failed"),
    );
  } finally {
    isSaving.value = false;
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
        :label="$t('page.timeline.create.button')"
        @click="openCreate"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">{{ $t("page.timeline.description") }}</p>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.timeline.loading") }}
        </p>

        <SErrorState
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.timeline.loadError')"
          @retry="refresh()"
        />

        <div
          v-else-if="entries.length === 0"
          class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">{{ $t("page.timeline.empty.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.timeline.empty.description") }}</p>
          </div>
          <SButton
            icon="i-fluent-add-24-regular"
            :label="$t('page.timeline.create.button')"
            @click="openCreate"
          />
        </div>

        <ClientOnly v-else>
          <STable :data="entries" :columns="columns" sticky>
            <template #date-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums">{{ dateLabel(row.original) }}</span>
            </template>
            <template #kind-cell="{ row }">
              <SBadge :color="row.original.kind === 'patch' ? 'info' : 'warning'">
                {{ $t(`page.timeline.kinds.${row.original.kind}`) }}
              </SBadge>
            </template>
            <template #nameEn-cell="{ row }">
              <div class="flex max-w-md flex-col gap-1 whitespace-normal">
                <span>{{ row.original.nameEn }}</span>
                <span class="text-muted" lang="fr">{{ row.original.nameFr }}</span>
              </div>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <SButton
                  variant="tertiary"
                  size="sm"
                  icon="i-fluent-edit-24-regular"
                  :aria-label="$t('page.timeline.edit.title')"
                  @click="openEdit(row.original)"
                />
                <SButton
                  variant="tertiary"
                  danger
                  size="sm"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.timeline.delete.title')"
                  @click="entryToDelete = row.original"
                />
              </div>
            </template>
          </STable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <SModal
      v-model:open="isFormOpen"
      :title="$t(editing ? 'page.timeline.edit.title' : 'page.timeline.create.title')"
      :description="$t('page.timeline.form.description')"
      :dismissible="!isSaving"
    >
      <template #body>
        <TimelineEntryForm
          :key="editing?.id ?? 'new'"
          :entry="editing ?? undefined"
          :submit-label="$t(editing ? 'page.timeline.edit.submit' : 'page.timeline.create.submit')"
          :loading="isSaving"
          @submit="save"
        />
      </template>
    </SModal>

    <ConfirmDeleteModal
      v-model:target="entryToDelete"
      :title="$t('page.timeline.delete.title')"
      :confirm-label="$t('page.timeline.delete.confirmButton')"
      :message="(target) => $t('page.timeline.delete.confirm', { name: target.nameEn })"
      :remove="(target) => deleteTimelineEntry(target.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
