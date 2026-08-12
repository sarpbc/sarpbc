<script lang="ts" setup>
import type { NewsArticleListItem } from "~/composables/news";

const localePath = useLocalePath();

const props = defineProps<{
  article: NewsArticleListItem;
  showImage?: boolean;
}>();

const imageUrl = computed(() => {
  if (!props.showImage) {
    return null;
  }
  return props.article.imageUrl?.trim() || null;
});
</script>

<template>
  <SListItem
    :size="imageUrl ? 'triple' : 'default'"
    divider
    :to="localePath(`/news/${props.article.slug}`)"
    class="min-w-0 overflow-hidden"
  >
    <div v-if="imageUrl" class="flex h-full w-full min-w-0 items-stretch gap-x-3">
      <div
        class="aspect-video h-full shrink-0 self-stretch overflow-hidden bg-elevated ring-1 ring-black/10 dark:ring-white/10"
      >
        <NuxtImg
          :src="imageUrl"
          alt=""
          width="234"
          height="132"
          sizes="234px"
          loading="eager"
          fetchpriority="high"
          class="h-full w-full object-cover"
        />
      </div>
      <h2
        class="min-w-0 flex-1 self-center text-xs font-medium leading-snug text-toned line-clamp-5"
      >
        {{ props.article.title }}
      </h2>
    </div>

    <div v-else class="flex w-full min-w-0 items-center justify-between gap-x-3">
      <h2 class="min-w-0 flex-1 truncate text-xs font-medium text-toned">
        {{ props.article.title }}
      </h2>
      <p class="shrink-0 text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(props.article.createdAt)) }}
      </p>
    </div>
  </SListItem>
</template>
