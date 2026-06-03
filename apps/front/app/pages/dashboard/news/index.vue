<script lang="ts" setup>
import type { TableColumn, TableRow } from "@nuxt/ui";

const { t } = useI18n();
const localePath = useLocalePath();

const df = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const items = [
  {
    label: t("page.dashboard.news.title"),
  },
];

const columns: TableColumn<NewsArticle>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "author",
    header: "Author",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      return df.format(date);
    },
  },
];

const newsArticles = ref<NewsArticle[]>([]);
const total = ref(0);
const limit = 25;
const page = ref(0);

const { status, data } = await useLazyAsyncData(
  () => `admin-news-articles-${page.value}-search`,
  async () => getNewsArticlesAdmin(page.value * limit, limit),
  {
    default: () => ({ data: [], total: 0 }) as { data: NewsArticle[]; total: number },
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
  navigateTo(localePath(`/dashboard/news/${row.original.slug}`));
}

async function updatePage(value: number) {
  page.value = value;
}
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UButton
        icon="i-fluent-add-24-regular"
        :label="$t('page.dashboard.news.create.title')"
        :to="localePath('/dashboard/news/create')"
        class="cursor-pointer"
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
            tbody:
              '[&>tr]:last:[&>td]:border-b-0 [&>tr]:hover:cursor-pointer [&>tr]:hover:!bg-transparent',
            th: 'first:rounded-l-lg last:rounded-r-lg border-y border-muted first:border-l last:border-r',
            td: 'border-b border-muted',
          }"
          :loading="status === 'pending'"
          @select="selectRow"
        />
        <div v-if="total > limit" class="w-full flex flex-row justify-between">
          <span class="text-muted">
            {{ t("dashboard.article.articlesNumber", { count: total }) }}
          </span>
          <UPagination
            :page="page"
            :total="total"
            :items-per-page="limit"
            @update:page="updatePage"
          />
        </div>
      </ClientOnly>
    </DashboardContent>
  </NuxtLayout>
</template>
