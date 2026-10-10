<script lang="ts" setup>
import type { RouteLocationRaw } from "vue-router";

const { currentPage, totalPages, hasPrevious, hasNext, previousTo, nextTo } = defineProps<{
  currentPage: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousTo: RouteLocationRaw;
  nextTo: RouteLocationRaw;
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

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}
</script>

<template>
  <SCard class="flex h-row items-center">
    <nav class="flex w-full items-center justify-between gap-2 px-2" :aria-label="t('common.page')">
      <ULink
        :disabled="!hasPrevious"
        :to="previousTo"
        as="link"
        class="flex flex-row items-center gap-1 text-sm font-medium text-muted enabled:hover:text-highlighted disabled:cursor-default"
        @click="scrollToTopOnNavigate($event, hasPrevious)"
      >
        {{ t("common.previous") }}
      </ULink>

      <div class="text-sm text-muted tabular-nums">
        {{ t("common.page") }} {{ currentPage }} / {{ totalPages }}
      </div>

      <ULink
        :disabled="!hasNext"
        :to="nextTo"
        as="link"
        class="flex flex-row items-center gap-1 text-sm font-medium text-muted enabled:hover:text-highlighted disabled:cursor-default"
        @click="scrollToTopOnNavigate($event, hasNext)"
      >
        {{ t("common.next") }}
      </ULink>
    </nav>
  </SCard>
</template>
