<script lang="ts" setup>
import type { NewsArticle } from "~/composables/news";

const { article } = defineProps<{ article: NewsArticle }>();
</script>

<template>
  <UiCrossLink :to="$localePath(`/news/${article.slug}`)">
    <div class="w-full flex flex-row items-center justify-between px-4 py-2">
      <h2 class="text-toned font-medium text-lg truncate">
        {{ article.title }}
      </h2>
      <p class="text-muted font-light truncate">
        {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
      </p>
    </div>
  </UiCrossLink>
</template>
