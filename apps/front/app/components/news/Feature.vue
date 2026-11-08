<script lang="ts" setup>
import { newsPath } from "@sarpbc/utils";
import type { NewsArticleListItem } from "~/types/news";
import { newsCoverTransitionName } from "~/utils/newsCoverTransition";

const localePath = useLocalePath();

const { article } = defineProps<{
  article: NewsArticleListItem;
}>();

const imageUrl = computed(() => article.imageUrl?.trim() || null);
</script>

<template>
  <SCrossCard as="article">
    <NuxtLink
      :to="localePath(newsPath(article.slug))"
      class="group interactive-surface grid w-full self-stretch sm:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <div
        class="aspect-video overflow-hidden bg-muted sm:aspect-auto sm:min-h-56"
        :style="{ viewTransitionName: newsCoverTransitionName(article.slug) }"
      >
        <NuxtImg
          v-if="imageUrl"
          :src="imageUrl"
          alt=""
          width="576"
          height="448"
          sizes="100vw sm:288px"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="flex min-w-0 flex-col justify-center gap-3 p-6">
        <p class="text-xs text-muted tabular-nums">
          {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
        </p>
        <h2 class="text-2xl font-medium tracking-tight text-highlighted text-balance md:text-3xl">
          {{ article.title }}
        </h2>
        <p v-if="article.excerpt" class="text-muted line-clamp-3">{{ article.excerpt }}</p>
      </div>
    </NuxtLink>
  </SCrossCard>
</template>
