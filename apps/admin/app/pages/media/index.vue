<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { MediaImage } from "~/composables/images";

const { t } = useI18n();

const breadcrumbItems = [
  {
    label: t("page.media.title"),
  },
];

const columns: TableColumn<MediaImage>[] = [
  {
    id: "preview",
    header: t("page.media.columns.preview"),
    meta: {
      class: {
        th: "w-28",
        td: "w-28",
      },
    },
  },
  {
    accessorKey: "source",
    header: t("page.media.columns.source"),
    cell: ({ getValue }) => (getValue() as string | null) ?? "—",
  },
  {
    accessorKey: "sourceUrl",
    header: t("page.media.columns.sourceUrl"),
  },
  {
    accessorKey: "createdAt",
    header: t("page.media.columns.uploadedAt"),
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    },
  },
];

const images = ref<MediaImage[]>([]);
const total = ref(0);
const limit = 25;
const page = ref(1);

const { status, data, refresh } = await useLazyAsyncData(
  () => `admin-media-${page.value}`,
  async () => listMediaImages({ page: page.value - 1, limit }),
  {
    default: () => ({ data: [], total: 0, page: 0, limit }),
    watch: [page],
    server: false,
  },
);

watch(
  status,
  (s) => {
    if (s === "success" && data.value) {
      images.value = data.value.data;
      total.value = data.value.total;
    }
  },
  { immediate: true },
);
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <div class="flex flex-col gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">{{ $t("page.media.title") }}</h1>
        <p class="text-sm text-muted">{{ $t("page.media.subtitle") }}</p>
      </div>

      <UTable :data="images" :columns="columns">
        <template #preview-cell="{ row }">
          <img
            :src="row.original.url"
            alt=""
            class="h-14 w-24 rounded-sm border border-default object-cover"
          />
        </template>
        <template #sourceUrl-cell="{ row }">
          <a
            v-if="row.original.sourceUrl"
            :href="row.original.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm underline-offset-2 hover:underline"
          >
            {{ row.original.sourceUrl }}
          </a>
          <span v-else class="text-sm text-muted">—</span>
        </template>
      </UTable>

      <div class="flex justify-end">
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="limit"
          @update:page="refresh"
        />
      </div>
    </div>
  </NuxtLayout>
</template>
