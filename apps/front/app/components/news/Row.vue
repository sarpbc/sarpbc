<script lang="ts" setup>
import type { NewsArticle } from "~/composables/news";

const { article } = defineProps<{ article: NewsArticle }>();
</script>

<template>
  <UiCrossLink :to="$localePath(`/news/${article.slug}`)">
    <UiListItem size="default" class="px-4!">
      <div class="flex w-full flex-row items-center justify-between gap-3 min-w-0">
        <h2 class="text-toned font-medium text-lg truncate">
          {{ article.title }}
        </h2>
        <p class="shrink-0 text-muted font-light truncate">
          {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
        </p>
      </div>
    </UiListItem>
  </UiCrossLink>
</template>
