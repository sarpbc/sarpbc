<script lang="ts" setup>
const {
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  getPageQuery,
  offset,
  pageSize,
  basePath = "/matches",
} = defineProps<{
  currentPage: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  getPageQuery: (nextOffset: number) => OffsetPageQuery;
  offset: number;
  pageSize: number;
  basePath?: string;
}>();

const { t } = useI18n();

function scrollToTopOnNavigate(event: MouseEvent, enabled: boolean) {
  if (!enabled) {
    event.preventDefault();
    return;
  }

  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
  <SCard>
    <div class="flex justify-between items-center gap-2 p-2">
      <ULink
        :disabled="!hasPrevious"
        :to="{ path: $localePath(basePath), query: getPageQuery(offset - pageSize) }"
        as="link"
        class="text-muted enabled:hover:text-highlighted disabled:cursor-default text-sm font-medium flex flex-row gap-1 items-center"
        @click="scrollToTopOnNavigate($event, hasPrevious)"
      >
        {{ t("common.previous") }}
      </ULink>

      <div class="text-sm text-muted tabular-nums">
        {{ t("common.page") }} {{ currentPage }} / {{ totalPages }}
      </div>

      <ULink
        :disabled="!hasNext"
        variant="ghost"
        :to="{ path: $localePath(basePath), query: getPageQuery(offset + pageSize) }"
        as="link"
        class="text-muted enabled:hover:text-highlighted disabled:cursor-default text-sm font-medium flex flex-row gap-1 items-center"
        @click="scrollToTopOnNavigate($event, hasNext)"
      >
        {{ t("common.next") }}
      </ULink>
    </div>
  </SCard>
</template>
