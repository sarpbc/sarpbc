<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { ASSIGNABLE_ROLES, type AdminUser, type AssignableRole } from "~/types/user";
import { getApiErrorMessage } from "~/utils/apiError";

const LIMIT = 25;

const { t, locale } = useI18n();
const toast = useToast();
const currentUser = useUser();

const breadcrumbItems = [{ label: t("page.users.title") }];

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
);

const roleItems = computed(() =>
  ASSIGNABLE_ROLES.map((role) => ({ value: role, label: t(`page.users.roles.${role}`) })),
);

const columns: TableColumn<AdminUser>[] = [
  { accessorKey: "userName", header: t("page.users.columns.userName") },
  { accessorKey: "email", header: t("page.users.columns.email") },
  { id: "role", header: t("page.users.columns.role") },
  {
    accessorKey: "createdAt",
    header: t("page.users.columns.createdAt"),
    cell: ({ getValue }) => dateFormatter.value.format(new Date(getValue() as string)),
  },
];

const searchInput = ref("");
const search = ref("");
const page = ref(1);
const savingId = ref<string | null>(null);
const pendingChange = ref<{ user: AdminUser; role: AssignableRole } | null>(null);
const isConfirmOpen = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(searchInput, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    search.value = value.trim();
    page.value = 1;
  }, 300);
});

onBeforeUnmount(() => {
  clearTimeout(searchTimer);
});

const { status, data, error, refresh } = await useLazyAsyncData(
  () => `admin-users-${search.value}-${page.value}`,
  () => getUsers({ search: search.value, limit: LIMIT, offset: (page.value - 1) * LIMIT }),
  {
    default: () => ({ users: [], total: 0 }),
    watch: [search, page],
    server: false,
  },
);

function roleOf(user: AdminUser): AssignableRole {
  return user.role ?? "member";
}

function requestRoleChange(user: AdminUser, role: AssignableRole) {
  if (role === roleOf(user)) {
    return;
  }
  if (role === "admin" || user.role === "admin") {
    pendingChange.value = { user, role };
    isConfirmOpen.value = true;
    return;
  }
  void applyRoleChange(user, role);
}

async function applyRoleChange(user: AdminUser, role: AssignableRole) {
  savingId.value = user.id;
  try {
    await changeUserRole(user.id, role);
    toast.add({
      title: t("page.users.messages.updated", {
        user: user.userName,
        role: t(`page.users.roles.${role}`),
      }),
      color: "success",
    });
  } catch (changeError) {
    toast.add({
      title: t("page.users.messages.errorTitle"),
      description: getApiErrorMessage(changeError) ?? t("page.users.messages.updateError"),
      color: "error",
    });
  } finally {
    savingId.value = null;
    await refresh();
  }
}

async function confirmChange() {
  const change = pendingChange.value;
  if (!change) {
    return;
  }
  isConfirmOpen.value = false;
  pendingChange.value = null;
  await applyRoleChange(change.user, change.role);
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          class="w-full max-w-sm"
          :placeholder="$t('page.users.searchPlaceholder')"
          :aria-label="$t('page.users.searchPlaceholder')"
        />

        <div
          v-if="status === 'error'"
          class="flex flex-col items-start gap-3 rounded-lg border border-default p-6"
        >
          <p class="text-sm text-muted">
            {{ getApiErrorMessage(error) ?? $t("page.users.loadError") }}
          </p>
          <UButton
            icon="i-fluent-arrow-clockwise-24-regular"
            variant="soft"
            :label="$t('page.users.retry')"
            @click="refresh()"
          />
        </div>

        <ClientOnly v-else>
          <UTable :data="data.users" :columns="columns" :loading="status === 'pending'" sticky>
            <template #empty>
              {{ search ? $t("page.users.emptySearch") : $t("page.users.empty") }}
            </template>
            <template #userName-cell="{ row }">
              <span translate="no">{{ row.original.userName }}</span>
            </template>
            <template #email-cell="{ row }">
              <span translate="no">{{ row.original.email }}</span>
            </template>
            <template #role-cell="{ row }">
              <USelect
                :model-value="roleOf(row.original)"
                :items="roleItems"
                class="w-40"
                :aria-label="$t('page.users.columns.role')"
                :disabled="row.original.id === currentUser?.id || savingId === row.original.id"
                :loading="savingId === row.original.id"
                @update:model-value="requestRoleChange(row.original, $event)"
              />
            </template>
          </UTable>
          <div v-if="data.total > LIMIT" class="mt-4 flex w-full flex-row justify-between">
            <span class="text-muted">
              {{ $t("page.users.usersCount", { count: data.total }, data.total) }}
            </span>
            <UPagination
              :page="page"
              :total="data.total"
              :items-per-page="LIMIT"
              @update:page="page = $event"
            />
          </div>
        </ClientOnly>
      </div>
    </DashboardContent>

    <UModal
      v-model:open="isConfirmOpen"
      :title="$t('page.users.confirm.title')"
      :description="
        pendingChange
          ? $t('page.users.confirm.description', {
              user: pendingChange.user.userName,
              from: $t(`page.users.roles.${roleOf(pendingChange.user)}`),
              to: $t(`page.users.roles.${pendingChange.role}`),
            })
          : ''
      "
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('page.users.confirm.cancel')"
          @click="isConfirmOpen = false"
        />
        <UButton color="error" :label="$t('page.users.confirm.confirm')" @click="confirmChange" />
      </template>
    </UModal>
  </NuxtLayout>
</template>
