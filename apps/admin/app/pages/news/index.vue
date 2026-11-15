<script lang="ts" setup>
import type { NewsArticleAdmin, NewsType } from "@sarpbc/types";
import type { MenuItem, TableColumn, TableRow } from "@sarpbc/design";
import { getApiErrorMessage, hasFrenchTranslation } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const dateFormatter = useDateFormatter({ day: "numeric", month: "short", year: "numeric" });

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
    cell: ({ row }) =>
      hasFrenchTranslation({
        contentFr: row.original.contentFr ?? null,
        titleFr: row.original.titleFr ?? null,
      })
        ? t("page.news.locale.enFr")
        : t("page.news.locale.enOnly"),
    header: t("page.news.columns.languages"),
    id: "languages",
  },
  {
    accessorKey: "type",
    cell: ({ row }) => {
      const value = row.original.type;

      return value === "article" ? t("page.news.type.article") : t("page.news.type.short");
    },
    header: t("page.news.columns.format"),
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => dateFormatter.value.format(new Date(row.original.createdAt)),
    header: t("page.news.columns.createdAt"),
  },
  {
    header: "",
    id: "actions",
    meta: {
      class: {
        td: "w-12",
        th: "w-12",
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
  const response = await getNewsArticlesAdmin(range);

  return { items: response.data, total: response.total };
});

const articleToRename = ref<NewsArticleAdmin | null>(null);
const isRenameModalOpen = ref(false);
const renameTitle = ref("");
const renameTitleFr = ref("");
const isRenaming = ref(false);

const articleToDelete = ref<NewsArticleAdmin | null>(null);
const isPublishing = ref(false);

const selectRow = (e: Event, row: TableRow<NewsArticleAdmin>) => {
  e.preventDefault();
  navigateTo(localePath(`/news/${row.original.slug}`));
};

const openRenameModal = (article: NewsArticleAdmin) => {
  articleToRename.value = article;
  renameTitle.value = article.title;
  renameTitleFr.value = article.titleFr ?? "";
  isRenameModalOpen.value = true;
};

const togglePublish = async (article: NewsArticleAdmin) => {
  if (isPublishing.value) {
    return;
  }

  isPublishing.value = true;

  try {
    await (article.isDraft ? publishNewsArticle(article.slug) : unpublishNewsArticle(article.slug));

    article.isDraft = !article.isDraft;
    toast.add({
      color: "success",
      title: article.isDraft ? t("page.news.edit.unpublished") : t("page.news.edit.published"),
    });
  } catch (publishError) {
    reportError(publishError, t("page.news.edit.publishFailed"));
  } finally {
    isPublishing.value = false;
  }
};

const articleActions = (article: NewsArticleAdmin): MenuItem[][] => [
  [
    {
      icon: "i-fluent-edit-24-regular",
      label: t("page.news.actions.editName"),
      onSelect: () => openRenameModal(article),
    },
    {
      icon: article.isDraft
        ? "i-fluent-checkmark-circle-24-regular"
        : "i-fluent-eye-off-24-regular",
      label: article.isDraft ? t("page.news.edit.publish") : t("page.news.edit.unpublish"),
      onSelect: () => togglePublish(article),
    },
  ],
  [
    {
      danger: true,
      icon: "i-fluent-delete-24-regular",
      label: t("page.news.actions.delete"),
      onSelect: () => (articleToDelete.value = article),
    },
  ],
];

const saveTitle = async () => {
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
      color: "success",
      title: t("page.news.actions.renamed"),
    });
    await refresh();
  } catch (renameError) {
    reportError(renameError, t("page.news.actions.renameFailed"));
  } finally {
    isRenaming.value = false;
  }
};

const onDeleted = async () => {
  toast.add({
    color: "success",
    title: t("page.news.actions.deleted"),
  });
  await refresh();
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SbBreadcrumb :items="items" />
    </template>
    <template #action>
      <SbButton
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
        <SbTable
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
              <SbDropdownMenu :items="articleActions(row.original)" align="end">
                <SbButton
                  variant="tertiary"
                  size="sm"
                  icon="i-fluent-more-vertical-24-regular"
                  :aria-label="$t('page.news.actions.menu')"
                />
              </SbDropdownMenu>
            </div>
          </template>
        </SbTable>
        <div v-if="total > limit" class="flex w-full flex-row justify-between">
          <span class="text-muted">
            {{ t("page.news.articlesCount", { count: total }) }}
          </span>
          <SbPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="page = $event"
          />
        </div>
      </ClientOnly>

      <SbModal
        v-model:open="isRenameModalOpen"
        :title="$t('page.news.actions.renameTitle')"
        :dismissible="!isRenaming"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <SbFormField :label="$t('page.news.locale.titleEn')" required>
              <SbInput v-model="renameTitle" class="w-full" autofocus />
            </SbFormField>
            <SbFormField
              :label="$t('page.news.locale.titleFr')"
              :hint="$t('page.news.locale.fallbackHint')"
            >
              <SbInput v-model="renameTitleFr" class="w-full" />
            </SbFormField>
          </div>
        </template>
        <template #footer>
          <SbButton
            :loading="isRenaming"
            :disabled="isRenaming"
            :label="$t('page.news.actions.editName')"
            @click="saveTitle"
          />
          <SbButton
            variant="secondary"
            :label="$t('common.cancel')"
            :disabled="isRenaming"
            @click="isRenameModalOpen = false"
          />
        </template>
      </SbModal>

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
