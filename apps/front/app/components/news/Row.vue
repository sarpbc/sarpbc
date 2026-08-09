<script lang="ts" setup>
import type { NewsArticleListItem } from "~/composables/news";

const localePath = useLocalePath();

const props = defineProps<{
  article: NewsArticleListItem;
  /**
   * Parent decides which row may render a thumb (homepage: first with image).
   * Later can be driven by a per-article DB flag.
   */
  showImage?: boolean;
}>();

const excerpt = computed(() => props.article.excerpt?.trim() ?? "");
const hasExcerpt = computed(() => excerpt.value.length > 0);
const imageUrl = computed(() => {
  if (!props.showImage) {
    return null;
  }
  return props.article.imageUrl?.trim() || null;
});
</script>

<template>
  <UiListItem
    size="default"
    divider
    :to="localePath(`/news/${props.article.slug}`)"
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
          loading="eager"
          fetchpriority="high"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h2
          class="min-h-0 min-w-0 text-xs font-medium leading-tight text-toned"
          :class="hasExcerpt ? 'line-clamp-1' : 'line-clamp-2'"
        >
          {{ props.article.title }}
        </h2>
        <p
          v-if="hasExcerpt"
          class="min-h-0 min-w-0 text-xs font-normal leading-tight text-muted line-clamp-1"
        >
          {{ excerpt }}
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1 self-center">
        <DiscussionCommentCount :count="props.article.commentCount ?? 0" />
        <p class="text-end text-xs font-thin text-muted tabular-nums">
          {{ formatLocaleTimeAgo(new Date(props.article.createdAt)) }}
        </p>
      </div>
    </div>
  </UiListItem>
</template>
