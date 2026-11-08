<script lang="ts" setup>
import { newsPath } from "@sarpbc/utils";
import type { NewsArticleListItem } from "~/types/news";

const localePath = useLocalePath();

const { article } = defineProps<{
  article: NewsArticleListItem;
}>();
</script>

<template>
  <SListItem :to="localePath(newsPath(article.slug))" class="min-w-0 gap-x-4 overflow-hidden">
    <h2 class="min-w-0 flex-1 truncate text-row text-default group-hover:text-highlighted">
      {{ article.title }}
    </h2>
    <p class="shrink-0 text-xs font-normal text-muted tabular-nums">
      {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
    </p>
  </SListItem>
</template>
