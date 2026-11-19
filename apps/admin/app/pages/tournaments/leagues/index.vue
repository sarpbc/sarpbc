<script lang="ts" setup>
import type { TableColumn } from "@sarpbc/design";
import type { League, LeagueInput } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const { data, status, error, refresh } = await useLazyAsyncData(
  "admin-tournament-leagues",
  () => getTournamentLeagues(),
  { default: () => [], server: false },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.leagues.title") },
]);

const columns: TableColumn<League>[] = [
  { header: "", id: "image" },
  { accessorKey: "name", header: t("page.tournaments.leagues.form.name") },
  {
    cell: ({ row }) => row.original.slug ?? "-",
    header: t("page.tournaments.form.slug"),
    id: "slug",
  },
  { header: t("page.tournaments.columns.source"), id: "source" },
  { header: t("page.tournaments.columns.actions"), id: "actions" },
];

interface LeagueFormState {
  name: string;
  slug: string;
  url: string;
  imageUrl: string;
}

const isOpen = ref(false);
const editing = ref<League | null>(null);
const form = ref<LeagueFormState>({ imageUrl: "", name: "", slug: "", url: "" });
const isSaving = ref(false);
const isUploading = ref(false);
const isSynced = computed(() => (editing.value?.pandascoreId ?? null) !== null);

const isPandascore = (league: League) => league.pandascoreId !== null;

const openForm = (league: League | null) => {
  editing.value = league;
  form.value = {
    imageUrl: league?.imageUrl ?? "",
    name: league?.name ?? "",
    slug: league?.slug ?? "",
    url: league?.url ?? "",
  };
  isOpen.value = true;
};

// WARNING: PandaScore owns every league field except the image, and the API rejects any other change.
const buildPayload = () => {
  const imageUrl = form.value.imageUrl.trim() || null;
  const league = editing.value;

  if (!league) {
    return {
      imageUrl: imageUrl ?? undefined,
      name: form.value.name.trim(),
      slug: form.value.slug.trim() || undefined,
      url: form.value.url.trim() || undefined,
    };
  }

  if (isPandascore(league)) {
    return { imageUrl };
  }

  return {
    imageUrl,
    name: form.value.name.trim(),
    slug: form.value.slug.trim() || null,
    url: form.value.url.trim() || null,
  };
};

const handleSubmit = async () => {
  if (isSaving.value || isUploading.value) {
    return;
  }

  if (!isSynced.value && !form.value.name.trim()) {
    toast.add({ color: "danger", title: t("page.tournaments.leagues.form.nameRequired") });

    return;
  }

  isSaving.value = true;

  try {
    await (editing.value
      ? updateLeague(editing.value.id, buildPayload())
      : createLeague(buildPayload()));
    toast.add({
      color: "success",
      title: editing.value
        ? t("page.tournaments.leagues.saved")
        : t("page.tournaments.leagues.created"),
    });
    isOpen.value = false;
    await refresh();
  } catch (saveError) {
    reportError(saveError, t("page.tournaments.leagues.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};

const uploadedImageUrl = computed({
  get: () => form.value.imageUrl || null,
  set: (value: string | null) => {
    form.value.imageUrl = value ?? "";
  },
});
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <SButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.tournaments.leagues.create')"
        @click="openForm(null)"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="max-w-2xl text-sm text-muted">{{ $t("page.tournaments.leagues.subtitle") }}</p>

        <SErrorState
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.tournaments.leagues.loadError')"
          @retry="refresh()"
        />

        <ClientOnly v-else>
          <STable :data="data" :columns="columns" :loading="status === 'pending'" sticky>
            <template #empty>
              {{ $t("page.tournaments.leagues.empty") }}
            </template>
            <template #image-cell="{ row }">
              <img
                v-if="row.original.imageUrl"
                :src="row.original.imageUrl"
                alt=""
                class="size-8 object-contain"
              />
              <div v-else class="size-8 rounded-sm bg-elevated" />
            </template>
            <template #source-cell="{ row }">
              <SBadge
                :color="isPandascore(row.original) ? 'neutral' : 'info'"
                :label="
                  $t(
                    `page.tournaments.source.${isPandascore(row.original) ? 'pandascore' : 'manual'}`,
                  )
                "
              />
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <SButton
                  variant="tertiary"
                  size="sm"
                  icon="i-fluent-edit-24-regular"
                  :title="$t('page.tournaments.leagues.edit')"
                  :aria-label="$t('page.tournaments.leagues.edit')"
                  @click="openForm(row.original)"
                />
              </div>
            </template>
          </STable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <SModal
      v-model:open="isOpen"
      :title="editing ? $t('page.tournaments.leagues.edit') : $t('page.tournaments.leagues.create')"
      :description="isSynced ? $t('page.tournaments.leagues.syncedHint') : undefined"
      :dismissible="!isSaving"
    >
      <template #body>
        <form id="league-form" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <SFormField :label="$t('page.tournaments.leagues.form.name')" required>
            <SInput v-model="form.name" class="w-full" autocomplete="off" :disabled="isSynced" />
          </SFormField>
          <SFormField
            :label="$t('page.tournaments.form.slug')"
            :hint="$t('page.tournaments.leagues.form.slugHint')"
          >
            <SInput
              v-model="form.slug"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              :disabled="isSynced"
            />
          </SFormField>
          <SFormField :label="$t('page.tournaments.leagues.form.url')">
            <SInput
              v-model="form.url"
              type="url"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://…"
              :disabled="isSynced"
            />
          </SFormField>
          <SFormField :label="$t('page.tournaments.leagues.form.image')">
            <ImageUpload
              v-model:image-url="uploadedImageUrl"
              target="tournament"
              :disabled="isSaving"
              @update:uploading="isUploading = $event"
            />
          </SFormField>
          <SFormField :label="$t('page.tournaments.form.imageUrl')">
            <SInput
              v-model="form.imageUrl"
              type="url"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://…"
              :disabled="isSaving || isUploading"
            />
          </SFormField>
        </form>
      </template>
      <template #footer>
        <SButton
          type="submit"
          form="league-form"
          icon="i-fluent-save-24-regular"
          :label="$t('page.tournaments.leagues.save')"
          :loading="isSaving"
          :disabled="isUploading"
        />
        <SButton
          variant="secondary"
          :label="$t('common.cancel')"
          :disabled="isSaving"
          @click="isOpen = false"
        />
      </template>
    </SModal>
  </NuxtLayout>
</template>
