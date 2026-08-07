<script lang="ts" setup>
import type { NewsArticleListItem } from "~/composables/news";

const localePath = useLocalePath();

const { article, priority = false } = defineProps<{
  article: NewsArticleListItem;
  /** Eager-load the first above-the-fold thumbnail; leave lazy otherwise. */
  priority?: boolean;
}>();

const excerpt = computed(() => article.excerpt?.trim() ?? "");
const hasExcerpt = computed(() => excerpt.value.length > 0);
const imageUrl = computed(() => article.imageUrl?.trim() || null);
</script>

<template>
  <UiListItem
    size="default"
    divider
    :to="localePath(`/news/${article.slug}`)"
    class="min-w-0 overflow-hidden"
  >
    <div class="flex w-full min-h-0 min-w-0 items-center gap-x-3">
      <div
        v-if="imageUrl"
        class="h-8 w-12 shrink-0 overflow-hidden bg-elevated ring-1 ring-black/10 dark:ring-white/10"
      >
        <NuxtImg
          :src="imageUrl"
          alt=""
          width="48"
          height="32"
          sizes="48px"
          :loading="priority ? 'eager' : 'lazy'"
          :fetchpriority="priority ? 'high' : undefined"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h2
          class="min-h-0 min-w-0 text-xs font-medium leading-tight text-toned"
          :class="hasExcerpt ? 'line-clamp-1' : 'line-clamp-2'"
        >
          {{ article.title }}
        </h2>
        <p
          v-if="hasExcerpt"
          class="min-h-0 min-w-0 text-xs font-normal leading-tight text-muted line-clamp-1"
        >
          {{ excerpt }}
        </p>
      </div>
      <p class="shrink-0 self-center text-end text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(article.createdAt)) }}
      </p>
    </div>
  </UiListItem>
</template>
