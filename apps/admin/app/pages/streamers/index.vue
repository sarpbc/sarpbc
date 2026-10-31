<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { TWITCH_LOGIN_PATTERN, twitchChannelUrl } from "@sarpbc/utils";
import type { TrackedStreamer } from "~/types/streamer";
import { getApiErrorMessage } from "~/utils/apiError";

const { t, locale } = useI18n();
const toast = useToast();

const breadcrumbItems = [
  {
    label: t("page.streamers.title"),
  },
];

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
);

const columns: TableColumn<TrackedStreamer>[] = [
  {
    accessorKey: "login",
    header: t("page.streamers.columns.login"),
  },
  {
    accessorKey: "displayName",
    header: t("page.streamers.columns.displayName"),
    cell: ({ getValue }) => (getValue() as string | null) ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: t("page.streamers.columns.createdAt"),
    cell: ({ getValue }) => dateFormatter.value.format(new Date(getValue() as string)),
  },
  {
    id: "actions",
    header: "",
  },
];

const isAddModalOpen = ref(false);
const isRemoveModalOpen = ref(false);
const streamerToRemove = ref<TrackedStreamer | null>(null);
const isAdding = ref(false);
const isRemoving = ref(false);
const newLogin = ref("");
const newDisplayName = ref("");

const normalizedLogin = computed(() => newLogin.value.trim().toLowerCase());
const isLoginValid = computed(() => TWITCH_LOGIN_PATTERN.test(normalizedLogin.value));

const {
  status,
  data: streamers,
  refresh,
  error,
} = await useLazyAsyncData("admin-streamers", () => getTrackedStreamers(), {
  default: () => [] as TrackedStreamer[],
  server: false,
});

function openAddModal() {
  newLogin.value = "";
  newDisplayName.value = "";
  isAddModalOpen.value = true;
}

function openRemoveModal(streamer: TrackedStreamer) {
  streamerToRemove.value = streamer;
  isRemoveModalOpen.value = true;
}

async function confirmAdd() {
  if (!isLoginValid.value) {
    return;
  }

  isAdding.value = true;
  try {
    await addTrackedStreamer(normalizedLogin.value, newDisplayName.value.trim() || null);
    isAddModalOpen.value = false;
    toast.add({
      title: t("page.streamers.add.success"),
      color: "success",
    });
    await refresh();
  } catch (err) {
    toast.add({
      title: getApiErrorMessage(err) ?? t("page.streamers.add.failed"),
      color: "error",
    });
  } finally {
    isAdding.value = false;
  }
}

async function confirmRemove() {
  if (!streamerToRemove.value) {
    return;
  }

  isRemoving.value = true;
  try {
    await removeTrackedStreamer(streamerToRemove.value.id);
    isRemoveModalOpen.value = false;
    streamerToRemove.value = null;
    toast.add({
      title: t("page.streamers.remove.success"),
      color: "success",
    });
    await refresh();
  } catch (err) {
    toast.add({
      title: getApiErrorMessage(err) ?? t("page.streamers.remove.failed"),
      color: "error",
    });
  } finally {
    isRemoving.value = false;
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
        :label="$t('page.streamers.add.button')"
        @click="openAddModal"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.streamers.description") }}
        </p>

        <p v-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.streamers.loading") }}
        </p>

        <div
          v-else-if="status === 'error'"
          class="flex flex-col items-start gap-3 rounded-lg border border-default p-6"
        >
          <p class="text-sm text-muted">
            {{ getApiErrorMessage(error) ?? $t("page.streamers.loadError") }}
          </p>
          <UButton
            icon="i-fluent-arrow-clockwise-24-regular"
            :label="$t('page.streamers.retry')"
            variant="soft"
            @click="refresh()"
          />
        </div>

        <template v-else>
          <p v-if="streamers.length > 0" class="text-sm text-muted">
            {{ $t("page.streamers.count", { count: streamers.length }, streamers.length) }}
          </p>

          <div
            v-if="streamers.length === 0"
            class="flex flex-col items-start gap-4 rounded-lg border border-default p-6"
          >
            <div class="flex flex-col gap-2">
              <h2 class="text-lg font-semibold">
                {{ $t("page.streamers.empty.title") }}
              </h2>
              <p class="text-sm text-muted">
                {{ $t("page.streamers.empty.description") }}
              </p>
            </div>
            <UButton
              icon="i-fluent-add-24-regular"
              :label="$t('page.streamers.add.button')"
              @click="openAddModal"
            />
          </div>

          <ClientOnly>
            <UTable v-if="streamers.length > 0" :data="streamers" :columns="columns" sticky>
              <template #login-cell="{ row }">
                <ULink :to="twitchChannelUrl(row.original.login)" target="_blank" class="font-mono">
                  {{ row.original.login }}
                </ULink>
              </template>
              <template #actions-cell="{ row }">
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.streamers.remove.title')"
                  @click="openRemoveModal(row.original)"
                />
              </template>
            </UTable>
          </ClientOnly>
        </template>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isAddModalOpen"
      :title="$t('page.streamers.add.title')"
      :dismissible="!isAdding"
    >
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="confirmAdd">
          <UFormField
            :label="$t('page.streamers.add.loginLabel')"
            :hint="$t('page.streamers.add.loginHint')"
            name="login"
            required
          >
            <UInput
              v-model="newLogin"
              :placeholder="$t('page.streamers.add.loginPlaceholder')"
              :maxlength="25"
              autocomplete="off"
              class="w-full"
              autofocus
            />
          </UFormField>
          <UFormField
            :label="$t('page.streamers.add.displayNameLabel')"
            :hint="$t('page.streamers.add.displayNameHint')"
            name="displayName"
          >
            <UInput
              v-model="newDisplayName"
              :placeholder="$t('page.streamers.add.displayNamePlaceholder')"
              :maxlength="100"
              class="w-full"
            />
          </UFormField>
        </form>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-add-24-regular"
          :label="$t('page.streamers.add.submit')"
          :loading="isAdding"
          :disabled="!isLoginValid"
          @click="confirmAdd"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isAdding"
          @click="isAddModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isRemoveModalOpen"
      :title="$t('page.streamers.remove.title')"
      :dismissible="!isRemoving"
    >
      <template #body>
        <p>
          {{
            $t("page.streamers.remove.confirm", {
              login: streamerToRemove?.login ?? "",
            })
          }}
        </p>
      </template>
      <template #footer>
        <UButton
          icon="i-fluent-delete-24-regular"
          color="error"
          :label="$t('page.streamers.remove.confirmButton')"
          :loading="isRemoving"
          @click="confirmRemove"
        />
        <UButton
          color="neutral"
          variant="subtle"
          :label="$t('common.cancel')"
          :disabled="isRemoving"
          @click="isRemoveModalOpen = false"
        />
      </template>
    </UModal>
  </NuxtLayout>
</template>
