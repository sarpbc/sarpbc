<script lang="ts" setup>
import type { NewsArticleListItem } from "~/composables/news";

const localePath = useLocalePath();

const { article } = defineProps<{
  article: NewsArticleListItem;
}>();
</script>

<template>
  <UiListItem
    size="default"
    divider
    :to="localePath(`/news/${article.slug}`)"
    class="min-w-0 overflow-hidden"
  >
    <div class="grid w-full min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
      <h2 class="min-h-0 min-w-0 text-xs font-medium leading-tight text-toned line-clamp-2">
        {{ article.title }}
      </h2>
      <p class="shrink-0 text-end text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
      </p>
    </div>
  </UiListItem>
</template>
