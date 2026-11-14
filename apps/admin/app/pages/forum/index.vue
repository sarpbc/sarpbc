<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { ForumPostListItem } from "@sarpbc/types";
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();

const breadcrumbItems = [
  {
    label: t("page.forum.title"),
  },
];

const columns: TableColumn<ForumPostListItem>[] = [
  {
    accessorKey: "title",
    header: t("page.forum.columns.title"),
  },
  {
    accessorKey: "author",
    header: t("page.forum.columns.author"),
  },
  {
    id: "topic",
    header: t("page.forum.columns.topic"),
    cell: ({ row }) => row.original.topic.title,
  },
  {
    accessorKey: "createdAt",
    header: t("page.forum.columns.createdAt"),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
  {
    id: "actions",
    header: "",
  },
];

const {
  items: posts,
  status,
  error,
  refresh,
} = useAdminList("admin-forum-posts", async () => {
  const posts = await getPosts();

  return { items: posts, total: posts.length };
});

const postToDelete = ref<ForumPostListItem | null>(null);

function selectRow(e: Event, row: TableRow<ForumPostListItem>) {
  e.preventDefault();
  navigateTo(localePath(`/forum/${row.original.id}`));
}

function openDeleteModal(e: Event, post: ForumPostListItem) {
  e.stopPropagation();
  postToDelete.value = post;
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.forum.postsCount", { count: posts.length }) }}
        </p>

        <LoadError
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
          @retry="refresh()"
        />

        <p v-else-if="status === 'success' && posts.length === 0" class="text-sm text-muted">
          {{ $t("page.forum.empty") }}
        </p>

        <ClientOnly v-if="status !== 'error'">
          <UTable
            v-if="posts.length > 0 || status === 'pending'"
            :data="posts"
            :columns="columns"
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
                :aria-label="$t('page.forum.delete.postTitle')"
                @click="(e) => openDeleteModal(e, row.original)"
              />
            </template>
          </UTable>
        </ClientOnly>
      </div>

      <ConfirmDeleteModal
        v-model:target="postToDelete"
        :title="$t('page.forum.delete.postTitle')"
        :confirm-label="$t('page.forum.delete.confirmButton')"
        :message="(post) => $t('page.forum.delete.postConfirm', { title: post.title })"
        :remove="(post) => deleteForumPost(post.id)"
        @deleted="refresh"
      />
    </DashboardContent>
  </NuxtLayout>
</template>
