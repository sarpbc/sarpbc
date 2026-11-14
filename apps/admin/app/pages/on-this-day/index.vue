<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";
import { getApiErrorMessage, tournamentStageLabel } from "@sarpbc/utils";

const { t, locale } = useI18n();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.onThisDay.title") }];

const columns: TableColumn<OnThisDayFact>[] = [
  { id: "date", header: t("page.onThisDay.table.date") },
  { accessorKey: "textEn", header: t("page.onThisDay.table.text") },
  { id: "link", header: t("page.onThisDay.table.link") },
  { id: "actions", header: "" },
];

const {
  status,
  data: facts,
  refresh,
  error,
} = await useLazyAsyncData("admin-on-this-day-facts", () => getOnThisDayFacts(), {
  default: (): OnThisDayFact[] => [],
  server: false,
});

const dayFormat = computed(
  () => new Intl.DateTimeFormat(locale.value, { month: "long", day: "numeric", timeZone: "UTC" }),
);

function dateLabel(fact: OnThisDayFact): string {
  const day = dayFormat.value.format(new Date(Date.UTC(2024, fact.month - 1, fact.day)));

  return fact.year ? `${day} ${fact.year}` : day;
}

function linkLabel(link: NonNullable<OnThisDayFact["link"]>): string {
  const name = link.kind === "tournament" ? tournamentStageLabel(link) : link.name;

  return `${t(`page.onThisDay.form.link.kinds.${link.kind}`)} · ${name}`;
}

const isFormOpen = ref(false);
const isSaving = ref(false);
const editing = ref<OnThisDayFact | null>(null);
const factToDelete = ref<OnThisDayFact | null>(null);

function openCreate() {
  editing.value = null;
  isFormOpen.value = true;
}

function openEdit(fact: OnThisDayFact) {
  editing.value = fact;
  isFormOpen.value = true;
}

async function save(input: OnThisDayFactInput) {
  isSaving.value = true;
  const current = editing.value;

  try {
    await (current ? updateOnThisDayFact(current.id, input) : createOnThisDayFact(input));
    isFormOpen.value = false;
    toast.add({
      title: t(current ? "page.onThisDay.edit.saved" : "page.onThisDay.create.success"),
      color: "success",
    });
    await refresh();
  } catch (saveError) {
    reportError(
      saveError,
      t(current ? "page.onThisDay.edit.failed" : "page.onThisDay.create.failed"),
    );
  } finally {
    isSaving.value = false;
  }
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
        :label="$t('page.onThisDay.create.button')"
        @click="openCreate"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">{{ $t("page.onThisDay.description") }}</p>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.onThisDay.loading") }}
        </p>

        <LoadError
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.onThisDay.loadError')"
          @retry="refresh()"
        />

        <div
          v-else-if="facts.length === 0"
          class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">{{ $t("page.onThisDay.empty.title") }}</h2>
            <p class="text-sm text-muted">{{ $t("page.onThisDay.empty.description") }}</p>
          </div>
          <UButton
            icon="i-fluent-add-24-regular"
            :label="$t('page.onThisDay.create.button')"
            @click="openCreate"
          />
        </div>

        <ClientOnly v-else>
          <UTable :data="facts" :columns="columns" sticky>
            <template #date-cell="{ row }">
              <span class="whitespace-nowrap tabular-nums">{{ dateLabel(row.original) }}</span>
            </template>
            <template #textEn-cell="{ row }">
              <div class="flex max-w-md flex-col gap-1 whitespace-normal">
                <span>{{ row.original.textEn }}</span>
                <span class="text-muted" lang="fr">{{ row.original.textFr }}</span>
              </div>
            </template>
            <template #link-cell="{ row }">
              <div v-if="row.original.link" class="flex flex-col items-start gap-1">
                <span class="text-sm" translate="no">{{ linkLabel(row.original.link) }}</span>
                <UBadge
                  v-if="row.original.link.source === 'startgg'"
                  color="warning"
                  variant="soft"
                  size="sm"
                >
                  {{ $t("page.onThisDay.table.hiddenStartgg") }}
                </UBadge>
              </div>
              <span v-else class="text-sm text-muted">{{ $t("page.onThisDay.table.noLink") }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-edit-24-regular"
                  :aria-label="$t('page.onThisDay.edit.title')"
                  @click="openEdit(row.original)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.onThisDay.delete.title')"
                  @click="factToDelete = row.original"
                />
              </div>
            </template>
          </UTable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isFormOpen"
      :title="$t(editing ? 'page.onThisDay.edit.title' : 'page.onThisDay.create.title')"
      :description="$t('page.onThisDay.form.description')"
      :dismissible="!isSaving"
    >
      <template #body>
        <OnThisDayFactForm
          :key="editing?.id ?? 'new'"
          :fact="editing ?? undefined"
          :submit-label="
            $t(editing ? 'page.onThisDay.edit.submit' : 'page.onThisDay.create.submit')
          "
          :loading="isSaving"
          @submit="save"
        />
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:target="factToDelete"
      :title="$t('page.onThisDay.delete.title')"
      :confirm-label="$t('page.onThisDay.delete.confirmButton')"
      :message="(target) => $t('page.onThisDay.delete.confirm', { date: dateLabel(target) })"
      :remove="(target) => deleteOnThisDayFact(target.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
