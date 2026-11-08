<script lang="ts" setup>
import type { NewsArticleListItem } from "~/types/news";

const localePath = useLocalePath();
const { t } = useI18n();

const { week, latest } = defineProps<{
  week: string;
  latest: NewsArticleListItem;
}>();
</script>

<template>
  <SListItem :to="localePath(`/news/week/${week}`)" class="min-w-0 gap-x-4 overflow-hidden">
    <h2 class="min-w-0 flex-1 truncate text-row text-default group-hover:text-highlighted">
      {{ t("page.home.latestShort", { title: latest.title }) }}
    </h2>
    <p class="shrink-0 text-xs font-normal text-muted tabular-nums">
      {{ formatLocaleTimeAgo(new Date(latest.createdAt)) }}
    </p>
  </SListItem>
</template>
