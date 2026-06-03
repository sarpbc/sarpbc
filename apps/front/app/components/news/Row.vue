<script lang="ts" setup>
import type { NewsCollectionItem } from "@nuxt/content";

const { article } = defineProps<{ article: NewsCollectionItem }>();
</script>

<template>
  <UiCrossLink :to="$localePath(`${article.path}`)">
    <div class="w-full flex flex-row items-center justify-between px-4 py-2">
      <h2 class="text-toned font-medium text-lg truncate">
        {{ article.title }}
      </h2>
      <p class="text-muted font-light truncate">
        {{ formatLocaleTimeAgo(new Date(article.date)) }}
      </p>
    </div>
  </UiCrossLink>
</template>
