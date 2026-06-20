<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { PostShort } from "~/types/forum";

const { t } = useI18n();
const localePath = useLocalePath();

const breadcrumbItems = [
  {
    label: t("page.dashboard.forum.title"),
  },
];

const columns: TableColumn<PostShort>[] = [
  {
    accessorKey: "title",
    header: t("page.dashboard.forum.columns.title"),
  },
  {
    accessorKey: "author",
    header: t("page.dashboard.forum.columns.author"),
  },
  {
    id: "topic",
    header: t("page.dashboard.forum.columns.topic"),
    cell: ({ row }) => row.original.topic?.title ?? "-",
  },
  {
    accessorKey: "createdAt",
    header: t("page.dashboard.forum.columns.createdAt"),
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleString(),
  },
];

const posts = ref<PostShort[]>([]);
const isDeleteModalOpen = ref(false);
const postToDelete = ref<PostShort | null>(null);
const isDeleting = ref(false);

const { status, data, refresh } = await useLazyAsyncData("admin-forum-posts", () => getPosts(), {
  server: false,
});

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      posts.value = data.value;
    }
  },
  { immediate: true },
);

function selectRow(e: Event, row: TableRow<PostShort>) {
  e.preventDefault();
  navigateTo(localePath(`/dashboard/forum/${row.original.id}`));
}

function openDeleteModal(e: Event, post: PostShort) {
  e.stopPropagation();
  postToDelete.value = post;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (!postToDelete.value) return;
  isDeleting.value = true;
  try {
    const success = await deleteForumPost(postToDelete.value.id);
    if (success) {
      isDeleteModalOpen.value = false;
      postToDelete.value = null;
      await refresh();
    }
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.dashboard.forum.postsCount", { count: posts.length }) }}
        </p>

        <ClientOnly>
          <UTable
            :data="posts"
            :columns="columns"
            :ui="{
              base: 'table-fixed border-separate border-spacing-0',
              thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
              tbody:
                '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:cursor-pointer [&>tr]:hover:!bg-transparent',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
              td: 'border-b border-muted',
            }"
            sticky
            :loading="status === 'pending'"
            @select="selectRow"
          >
            <template #actions-cell="{ row }">
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-fluent-delete-24-regular"
                @click="(e) => openDeleteModal(e, row.original)"
              />
            </template>
          </UTable>
        </ClientOnly>
      </div>

      <UModal v-model:open="isDeleteModalOpen">
        <template #content>
          <div class="p-6 flex flex-col gap-4">
            <h3 class="text-lg font-semibold">
              {{ $t("page.dashboard.forum.delete.postTitle") }}
            </h3>
            <p>
              {{
                $t("page.dashboard.forum.delete.postConfirm", {
                  title: postToDelete?.title ?? "",
                })
              }}
            </p>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                :label="$t('common.cancel')"
                @click="isDeleteModalOpen = false"
              />
              <UButton
                color="error"
                :loading="isDeleting"
                :label="$t('page.dashboard.forum.delete.confirmButton')"
                @click="confirmDelete"
              />
            </div>
          </div>
        </template>
      </UModal>
    </DashboardContent>
  </NuxtLayout>
</template>
