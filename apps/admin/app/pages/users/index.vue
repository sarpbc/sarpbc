<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { getApiErrorMessage } from "@sarpbc/utils";
import type { TableColumn } from "@nuxt/ui";
import type { UserListItem } from "@sarpbc/types";
import { ASSIGNABLE_ROLES, type AssignableRole } from "~/types/user";

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();
const currentUser = useUser();

const breadcrumbItems = [{ label: t("page.users.title") }];

const dateFormatter = useDateFormatter({ year: "numeric", month: "short", day: "numeric" });

const roleItems = computed(() =>
  ASSIGNABLE_ROLES.map((role) => ({ value: role, label: t(`page.users.roles.${role}`) })),
);

const columns: TableColumn<UserListItem>[] = [
  { accessorKey: "userName", header: t("page.users.columns.userName") },
  { accessorKey: "email", header: t("page.users.columns.email") },
  { id: "role", header: t("page.users.columns.role") },
  {
    accessorKey: "createdAt",
    header: t("page.users.columns.createdAt"),
    cell: ({ row }) => dateFormatter.value.format(new Date(row.original.createdAt)),
  },
];

const searchInput = ref("");
const savingId = ref<string | null>(null);
const pendingChange = ref<{ user: UserListItem; role: AssignableRole } | null>(null);
const isConfirmOpen = ref(false);

const {
  items: users,
  total,
  page,
  search,
  limit,
  status,
  error,
  refresh,
} = useAdminList("admin-users", async (range) => {
  const { users, total } = await getUsers(range);

  return { items: users, total };
});

watchDebounced(
  searchInput,
  (value) => {
    search.value = value.trim();
  },
  { debounce: SEARCH_DEBOUNCE_MS },
);

function roleOf(user: UserListItem): AssignableRole {
  return user.role ?? "member";
}

function requestRoleChange(user: UserListItem, role: AssignableRole) {
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

async function applyRoleChange(user: UserListItem, role: AssignableRole) {
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
    reportError(changeError, t("page.users.messages.updateError"));
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

        <LoadError
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.users.loadError')"
          @retry="refresh()"
        />

        <ClientOnly v-else>
          <UTable :data="users" :columns="columns" :loading="status === 'pending'" sticky>
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
          <div v-if="total > limit" class="mt-4 flex w-full flex-row justify-between">
            <span class="text-muted">
              {{ $t("page.users.usersCount", { count: total }, total) }}
            </span>
            <UPagination
              :page="page"
              :total="total"
              :items-per-page="limit"
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
