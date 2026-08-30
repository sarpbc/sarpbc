<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";
import type { PostShort } from "~/types/forum";

const { t } = useI18n();
const localePath = useLocalePath();

const breadcrumbItems = [
  {
    label: t("page.forum.title"),
  },
];

const columns: TableColumn<PostShort>[] = [
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
    cell: ({ row }) => row.original.topic?.title ?? "-",
  },
  {
    accessorKey: "createdAt",
    header: t("page.forum.columns.createdAt"),
    cell: ({ getValue }) => new Date(getValue() as string).toLocaleString(),
  },
  {
    id: "actions",
    header: "",
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
  navigateTo(localePath(`/forum/${row.original.id}`));
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
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.forum.postsCount", { count: posts.length }) }}
        </p>

        <p v-if="status === 'success' && posts.length === 0" class="text-sm text-muted">
          {{ $t("page.forum.empty") }}
        </p>

        <ClientOnly>
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

      <UModal
        v-model:open="isDeleteModalOpen"
        :title="$t('page.forum.delete.postTitle')"
        :dismissible="!isDeleting"
      >
        <template #body>
          <p>
            {{
              $t("page.forum.delete.postConfirm", {
                title: postToDelete?.title ?? "",
              })
            }}
          </p>
        </template>
        <template #footer>
          <UButton
            color="error"
            :loading="isDeleting"
            :label="$t('page.forum.delete.confirmButton')"
            @click="confirmDelete"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('common.cancel')"
            :disabled="isDeleting"
            @click="isDeleteModalOpen = false"
          />
        </template>
      </UModal>
    </DashboardContent>
  </NuxtLayout>
</template>
