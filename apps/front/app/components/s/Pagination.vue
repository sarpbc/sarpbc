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

const scrollToTopOnNavigate = (event: MouseEvent, enabled: boolean) => {
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
  window.scrollTo({ behavior: reduceMotion ? "auto" : "smooth", top: 0 });
};
</script>

<template>
  <SCard class="flex h-row items-center">
    <nav
      class="flex w-full items-center justify-between gap-2 px-1.5"
      :aria-label="t('common.page')"
    >
      <SbButton
        variant="tertiary"
        size="sm"
        :disabled="!hasPrevious"
        :to="previousTo"
        class="h-7 shrink-0 justify-center px-2 pointer-coarse:h-10"
        @click="scrollToTopOnNavigate($event, hasPrevious)"
      >
        {{ t("common.previous") }}
      </SbButton>

      <div class="text-sm text-muted tabular-nums">
        {{ t("common.page") }} {{ currentPage }} / {{ totalPages }}
      </div>

      <SbButton
        variant="tertiary"
        size="sm"
        :disabled="!hasNext"
        :to="nextTo"
        class="h-7 shrink-0 justify-center px-2 pointer-coarse:h-10"
        @click="scrollToTopOnNavigate($event, hasNext)"
      >
        {{ t("common.next") }}
      </SbButton>
    </nav>
  </SCard>
</template>
