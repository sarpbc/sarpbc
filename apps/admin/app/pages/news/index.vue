<script lang="ts" setup>
import type { NewsArticleAdmin, NewsType } from "@sarpbc/types";
import type { DropdownMenuItem, TableColumn, TableRow } from "@nuxt/ui";
import { getApiErrorMessage, hasFrenchTranslation } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const dateFormatter = useDateFormatter({ year: "numeric", month: "short", day: "numeric" });

const items = [
  {
    label: t("page.news.title"),
  },
];

const columns: TableColumn<NewsArticleAdmin>[] = [
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
    accessorKey: "type",
    header: t("page.news.columns.format"),
    cell: ({ row }) => {
      const value = row.original.type;

      return value === "article" ? t("page.news.type.article") : t("page.news.type.short");
    },
  },
  {
    accessorKey: "createdAt",
    header: t("page.news.columns.createdAt"),
    cell: ({ row }) => dateFormatter.value.format(new Date(row.original.createdAt)),
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

const {
  items: newsArticles,
  total,
  page,
  limit,
  status,
  error,
  refresh,
} = useAdminList("admin-news-articles", async (range) => {
  const { data, total } = await getNewsArticlesAdmin(range);

  return { items: data, total };
});

const articleToRename = ref<NewsArticleAdmin | null>(null);
const isRenameModalOpen = ref(false);
const renameTitle = ref("");
const renameTitleFr = ref("");
const isRenaming = ref(false);

const articleToDelete = ref<NewsArticleAdmin | null>(null);
const isPublishing = ref(false);

function selectRow(e: Event, row: TableRow<NewsArticleAdmin>) {
  e.preventDefault();
  navigateTo(localePath(`/news/${row.original.slug}`));
}

function articleActions(article: NewsArticleAdmin): DropdownMenuItem[][] {
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
        onSelect: () => (articleToDelete.value = article),
      },
    ],
  ];
}

function openRenameModal(article: NewsArticleAdmin) {
  articleToRename.value = article;
  renameTitle.value = article.title;
  renameTitleFr.value = article.titleFr ?? "";
  isRenameModalOpen.value = true;
}

async function saveTitle() {
  if (!articleToRename.value || !renameTitle.value.trim()) {
    return;
  }

  isRenaming.value = true;

  try {
    await editNewsArticle(articleToRename.value.slug, {
      title: renameTitle.value.trim(),
      titleFr: renameTitleFr.value.trim() || null,
    });
    isRenameModalOpen.value = false;
    articleToRename.value = null;
    toast.add({
      title: t("page.news.actions.renamed"),
      color: "success",
    });
    await refresh();
  } catch (renameError) {
    reportError(renameError, t("page.news.actions.renameFailed"));
  } finally {
    isRenaming.value = false;
  }
}

async function togglePublish(article: NewsArticleAdmin) {
  if (isPublishing.value) {
    return;
  }

  isPublishing.value = true;

  try {
    if (article.isDraft) {
      await publishNewsArticle(article.slug);
    } else {
      await unpublishNewsArticle(article.slug);
    }

    article.isDraft = !article.isDraft;
    toast.add({
      title: article.isDraft ? t("page.news.edit.unpublished") : t("page.news.edit.published"),
      color: "success",
    });
  } catch (publishError) {
    reportError(publishError, t("page.news.edit.publishFailed"));
  } finally {
    isPublishing.value = false;
  }
}

async function onDeleted() {
  toast.add({
    title: t("page.news.actions.deleted"),
    color: "success",
  });
  await refresh();
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
      <LoadError
        v-if="status === 'error'"
        :message="getApiErrorMessage(error) ?? $t('common.loadFailed')"
        @retry="refresh()"
      />
      <ClientOnly v-else>
        <UTable
          :data="newsArticles"
          :columns="columns"
          :loading="status === 'pending'"
          @select="selectRow"
        >
          <template #empty>
            {{ $t("page.news.empty") }}
          </template>
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
            @update:page="page = $event"
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

      <ConfirmDeleteModal
        v-model:target="articleToDelete"
        :title="$t('page.news.actions.delete')"
        :confirm-label="$t('page.news.actions.delete')"
        :message="(article) => $t('page.news.actions.deleteConfirm', { title: article.title })"
        :remove="(article) => deleteNewsArticle(article.slug)"
        @deleted="onDeleted"
      />
    </DashboardContent>
  </NuxtLayout>
</template>
