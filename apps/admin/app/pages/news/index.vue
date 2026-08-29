<script lang="ts" setup>
import type { DropdownMenuItem, TableColumn, TableRow } from "@nuxt/ui";
import { hasFrenchTranslation } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const df = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const items = [
  {
    label: t("page.news.title"),
  },
];

const columns: TableColumn<NewsArticle>[] = [
  {
    accessorKey: "title",
    header: t("page.news.columns.title"),
  },
  {
    accessorKey: "author",
    header: t("page.news.columns.author"),
  },
  {
    id: "languages",
    header: t("page.news.columns.languages"),
    cell: ({ row }) =>
      hasFrenchTranslation({
        titleFr: row.original.titleFr ?? null,
        contentFr: row.original.contentFr ?? null,
      })
        ? t("page.news.locale.enFr")
        : t("page.news.locale.enOnly"),
  },
  {
    accessorKey: "createdAt",
    header: t("page.news.columns.createdAt"),
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      return df.format(date);
    },
  },
  {
    id: "actions",
    header: "",
    meta: {
      class: {
        th: "w-12",
        td: "w-12",
      },
    },
  },
];

const newsArticles = ref<NewsArticle[]>([]);
const total = ref(0);
const limit = 25;
const page = ref(0);

const articleToRename = ref<NewsArticle | null>(null);
const isRenameModalOpen = ref(false);
const renameTitle = ref("");
const renameTitleFr = ref("");
const isRenaming = ref(false);

const articleToDelete = ref<NewsArticle | null>(null);
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const isPublishing = ref(false);

const { status, data, refresh } = await useLazyAsyncData(
  () => `admin-news-articles-${page.value}-search`,
  async () => getNewsArticlesAdmin(page.value * limit, limit),
  {
    default: () => ({ data: [], total: 0 }),
    watch: [page],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      newsArticles.value = data.value.data;
      total.value = data.value.total;
    }
  },
  { immediate: true },
);

function selectRow(e: Event, row: TableRow<NewsArticle>) {
  e.preventDefault();
  navigateTo(localePath(`/news/${row.original.slug}`));
}

function articleActions(article: NewsArticle): DropdownMenuItem[][] {
  return [
    [
      {
        label: t("page.news.actions.editName"),
        icon: "i-fluent-edit-24-regular",
        onSelect: () => openRenameModal(article),
      },
      {
        label: article.isDraft ? t("page.news.edit.publish") : t("page.news.edit.unpublish"),
        icon: article.isDraft
          ? "i-fluent-checkmark-circle-24-regular"
          : "i-fluent-eye-off-24-regular",
        onSelect: () => togglePublish(article),
      },
    ],
    [
      {
        label: t("page.news.actions.delete"),
        icon: "i-fluent-delete-24-regular",
        color: "error",
        onSelect: () => openDeleteModal(article),
      },
    ],
  ];
}

function openRenameModal(article: NewsArticle) {
  articleToRename.value = article;
  renameTitle.value = article.title;
  renameTitleFr.value = article.titleFr ?? "";
  isRenameModalOpen.value = true;
}

function openDeleteModal(article: NewsArticle) {
  articleToDelete.value = article;
  isDeleteModalOpen.value = true;
}

async function saveTitle() {
  if (!articleToRename.value || !renameTitle.value.trim()) {
    return;
  }

  isRenaming.value = true;
  try {
    const updated = await editNewsArticle(articleToRename.value.slug, {
      title: renameTitle.value.trim(),
      titleFr: renameTitleFr.value.trim() || null,
    });
    if (!updated) {
      toast.add({
        title: t("page.news.actions.renameFailed"),
        color: "error",
      });
      return;
    }
    isRenameModalOpen.value = false;
    articleToRename.value = null;
    toast.add({
      title: t("page.news.actions.renamed"),
      color: "success",
    });
    await refresh();
  } finally {
    isRenaming.value = false;
  }
}

async function togglePublish(article: NewsArticle) {
  if (isPublishing.value) {
    return;
  }
  isPublishing.value = true;
  try {
    const ok = article.isDraft
      ? await publishNewsArticle(article.slug)
      : await unpublishNewsArticle(article.slug);
    if (!ok) {
      toast.add({
        title: t("page.news.edit.publishFailed"),
        color: "error",
      });
      return;
    }
    article.isDraft = !article.isDraft;
    toast.add({
      title: article.isDraft ? t("page.news.edit.unpublished") : t("page.news.edit.published"),
      color: "success",
    });
  } finally {
    isPublishing.value = false;
  }
}

async function confirmDelete() {
  if (!articleToDelete.value) {
    return;
  }
  isDeleting.value = true;
  try {
    const ok = await deleteNewsArticle(articleToDelete.value.slug);
    if (!ok) {
      toast.add({
        title: t("page.news.actions.deleteFailed"),
        color: "error",
      });
      return;
    }
    isDeleteModalOpen.value = false;
    articleToDelete.value = null;
    toast.add({
      title: t("page.news.actions.deleted"),
      color: "success",
    });
    await refresh();
  } finally {
    isDeleting.value = false;
  }
}

async function updatePage(value: number) {
  page.value = value;
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.news.create.title')"
        :to="localePath('/news/create')"
      />
    </template>
    <DashboardContent>
      <ClientOnly>
        <UTable
          :data="newsArticles"
          :columns="columns"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-muted [&>tr]:after:content-none [&>tr:nth-child(2)]:h-0',
            tbody: '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:!bg-transparent',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
            td: 'border-b border-muted',
          }"
          :loading="status === 'pending'"
          @select="selectRow"
        >
          <template #actions-cell="{ row }">
            <div class="flex justify-end" @click.stop @pointerdown.stop>
              <UDropdownMenu :items="articleActions(row.original)" :content="{ align: 'end' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-fluent-more-vertical-24-regular"
                  :aria-label="$t('page.news.actions.menu')"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>
        <div v-if="total > limit" class="flex w-full flex-row justify-between">
          <span class="text-muted">
            {{ t("page.news.articlesCount", { count: total }) }}
          </span>
          <UPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="updatePage"
          />
        </div>
      </ClientOnly>

      <UModal
        v-model:open="isRenameModalOpen"
        :title="$t('page.news.actions.renameTitle')"
        :dismissible="!isRenaming"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField :label="$t('page.news.locale.titleEn')" name="title" required>
              <UInput v-model="renameTitle" class="w-full" autofocus />
            </UFormField>
            <UFormField
              :label="$t('page.news.locale.titleFr')"
              name="titleFr"
              :hint="$t('page.news.locale.fallbackHint')"
            >
              <UInput v-model="renameTitleFr" class="w-full" />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <UButton
            :loading="isRenaming"
            :disabled="isRenaming"
            :label="$t('page.news.actions.editName')"
            @click="saveTitle"
          />
          <UButton
            color="neutral"
            variant="subtle"
            :label="$t('common.cancel')"
            :disabled="isRenaming"
            @click="isRenameModalOpen = false"
          />
        </template>
      </UModal>

      <UModal
        v-model:open="isDeleteModalOpen"
        :title="$t('page.news.actions.delete')"
        :dismissible="!isDeleting"
      >
        <template #body>
          <p>
            {{
              $t("page.news.actions.deleteConfirm", {
                title: articleToDelete?.title ?? "",
              })
            }}
          </p>
        </template>
        <template #footer>
          <UButton
            color="error"
            :loading="isDeleting"
            :label="$t('page.news.actions.delete')"
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
