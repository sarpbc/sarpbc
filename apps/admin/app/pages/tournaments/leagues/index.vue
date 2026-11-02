<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { LeagueInput, TournamentLeague } from "~/composables/tournaments";
import { getApiErrorMessage } from "~/utils/apiError";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const { data, status, error, refresh } = await useLazyAsyncData(
  "admin-tournament-leagues",
  () => getTournamentLeagues(),
  { server: false, default: () => [] },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.leagues.title") },
]);

const columns: TableColumn<TournamentLeague>[] = [
  { id: "image", header: "" },
  { accessorKey: "name", header: t("page.tournaments.leagues.form.name") },
  {
    id: "slug",
    header: t("page.tournaments.form.slug"),
    cell: ({ row }) => row.original.slug ?? "-",
  },
  { id: "source", header: t("page.tournaments.columns.source") },
  { id: "actions", header: t("page.tournaments.columns.actions") },
];

interface LeagueFormState {
  name: string;
  slug: string;
  url: string;
  imageUrl: string;
}

const isOpen = ref(false);
const editing = ref<TournamentLeague | null>(null);
const form = ref<LeagueFormState>({ name: "", slug: "", url: "", imageUrl: "" });
const isSaving = ref(false);
const isUploading = ref(false);
const isSynced = computed(() => editing.value?.pandascoreId != null);

function isPandascore(league: TournamentLeague): boolean {
  return league.pandascoreId !== null;
}

function openForm(league: TournamentLeague | null) {
  editing.value = league;
  form.value = {
    name: league?.name ?? "",
    slug: league?.slug ?? "",
    url: league?.url ?? "",
    imageUrl: league?.imageUrl ?? "",
  };
  isOpen.value = true;
}

/** PandaScore owns every league field except the image, and the API rejects any other change. */
function buildPayload(): LeagueInput {
  const imageUrl = form.value.imageUrl.trim() || null;
  const league = editing.value;
  if (!league) {
    return {
      name: form.value.name.trim(),
      slug: form.value.slug.trim() || undefined,
      url: form.value.url.trim() || undefined,
      imageUrl: imageUrl ?? undefined,
    };
  }
  if (isPandascore(league)) return { imageUrl };
  return {
    name: form.value.name.trim(),
    slug: form.value.slug.trim() || null,
    url: form.value.url.trim() || null,
    imageUrl,
  };
}

async function handleSubmit() {
  if (isSaving.value || isUploading.value) return;
  if (!isSynced.value && !form.value.name.trim()) {
    toast.add({ title: t("page.tournaments.leagues.form.nameRequired"), color: "error" });
    return;
  }
  isSaving.value = true;
  try {
    if (editing.value) await updateLeague(editing.value.id, buildPayload());
    else await createLeague(buildPayload());
    toast.add({
      title: editing.value
        ? t("page.tournaments.leagues.saved")
        : t("page.tournaments.leagues.created"),
      color: "success",
    });
    isOpen.value = false;
    await refresh();
  } catch (error) {
    console.error("Failed to save league:", error);
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.tournaments.leagues.saveFailed"),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

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
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.tournaments.leagues.create')"
        @click="openForm(null)"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="max-w-2xl text-sm text-muted">{{ $t("page.tournaments.leagues.subtitle") }}</p>

        <TournamentLoadError
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.tournaments.leagues.loadError')"
          @retry="refresh()"
        />

        <ClientOnly v-else>
          <UTable :data="data" :columns="columns" :loading="status === 'pending'" sticky>
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
              <UBadge
                :color="isPandascore(row.original) ? 'neutral' : 'primary'"
                variant="subtle"
                :label="
                  $t(
                    `page.tournaments.source.${isPandascore(row.original) ? 'pandascore' : 'manual'}`,
                  )
                "
              />
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-edit-24-regular"
                  :title="$t('page.tournaments.leagues.edit')"
                  :aria-label="$t('page.tournaments.leagues.edit')"
                  @click="openForm(row.original)"
                />
              </div>
            </template>
          </UTable>
        </ClientOnly>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isOpen"
      :title="editing ? $t('page.tournaments.leagues.edit') : $t('page.tournaments.leagues.create')"
      :description="isSynced ? $t('page.tournaments.leagues.syncedHint') : undefined"
      :dismissible="!isSaving"
    >
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <UFormField :label="$t('page.tournaments.leagues.form.name')" name="name" required>
            <UInput v-model="form.name" class="w-full" autocomplete="off" :disabled="isSynced" />
          </UFormField>
          <UFormField
            :label="$t('page.tournaments.form.slug')"
            name="slug"
            :hint="$t('page.tournaments.leagues.form.slugHint')"
          >
            <UInput
              v-model="form.slug"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              :disabled="isSynced"
            />
          </UFormField>
          <UFormField :label="$t('page.tournaments.leagues.form.url')" name="url">
            <UInput
              v-model="form.url"
              type="url"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://…"
              :disabled="isSynced"
            />
          </UFormField>
          <UFormField :label="$t('page.tournaments.leagues.form.image')">
            <ImageUpload
              v-model:image-url="uploadedImageUrl"
              target="tournament"
              :disabled="isSaving"
              @update:uploading="isUploading = $event"
            />
          </UFormField>
          <UFormField :label="$t('page.tournaments.form.imageUrl')" name="imageUrl">
            <UInput
              v-model="form.imageUrl"
              type="url"
              class="w-full"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://…"
              :disabled="isSaving || isUploading"
            />
          </UFormField>
          <button type="submit" class="hidden" />
        </form>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-save-24-regular"
          :label="$t('page.tournaments.leagues.save')"
          :loading="isSaving"
          :disabled="isUploading"
          @click="handleSubmit"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isSaving"
          @click="isOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
