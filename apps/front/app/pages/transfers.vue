<script lang="ts" setup>
import type { LocationQueryRaw } from "vue-router";

const TRANSFERS_PER_PAGE = 25;

const { t } = useI18n();
const route = useRoute();
const { setPageSeo } = useSarpbcSeo();

const currentPage = computed(() => {
  const page = Number(route.query.page ?? 1);
  return Number.isInteger(page) && page >= 1 ? page : 1;
});
const offset = computed(() => (currentPage.value - 1) * TRANSFERS_PER_PAGE);

const { data, pending, error, refresh } = await useAsyncData(
  () => `transfers-page-${currentPage.value}`,
  () => getTransfers({ limit: TRANSFERS_PER_PAGE, offset: offset.value }),
  { default: () => ({ transfers: [], total: 0 }) },
);

const transfers = computed(() => data.value?.transfers ?? []);
const totalTransfers = computed(() => data.value?.total ?? 0);

const totalPages = computed(() => Math.ceil(totalTransfers.value / TRANSFERS_PER_PAGE));
const hasPrevious = computed(() => currentPage.value > 1);
const hasNext = computed(() => currentPage.value < totalPages.value);

function pageQuery(page: number): LocationQueryRaw {
  return page > 1 ? { page: String(page) } : {};
}

setPageSeo({
  title: t("page.transfers.seo.title"),
  description: t("page.transfers.seo.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.transfers.title") }}</template>
      <template v-if="totalTransfers > 0" #meta>
        <span>{{ t("page.hub.headers.transfersTotal", { count: totalTransfers }) }}</span>
      </template>
    </SHubPageHeader>

    <div>
      <SCard v-if="pending" flush-bottom aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in 8" :key="index" divider class="gap-3">
          <USkeleton class="h-3 w-20 shrink-0" />
          <USkeleton class="size-7 shrink-0" />
          <USkeleton class="h-3 max-w-40 flex-1" />
          <USkeleton class="h-3 w-20" />
          <USkeleton class="h-3 w-28" />
        </SListItem>
      </SCard>

      <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.transfers.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="transfers.length > 0" flush-bottom>
        <TransferRow v-for="transfer in transfers" :key="transfer.id" :transfer="transfer" />
      </SCard>

      <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-people-swap-24-regular"
          :title="t('components.transfer.empty.title')"
          :hint="t('components.transfer.empty.hint')"
        />
      </SCard>

      <SPagination
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        :has-previous="hasPrevious"
        :has-next="hasNext"
        :previous-to="{ path: $localePath('/transfers'), query: pageQuery(currentPage - 1) }"
        :next-to="{ path: $localePath('/transfers'), query: pageQuery(currentPage + 1) }"
        class="mt-row"
      />
    </div>
  </div>
</template>
