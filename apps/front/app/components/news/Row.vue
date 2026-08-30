<script lang="ts" setup>
import type { NewsArticleListItem } from "~/composables/news";
import { newsCoverTransitionName } from "~/utils/newsCoverTransition";

const localePath = useLocalePath();

const props = withDefaults(
  defineProps<{
    article: NewsArticleListItem;
    showImage?: boolean;
    headingLevel?: "h1" | "h2";
  }>(),
  {
    headingLevel: "h2",
  },
);

const titleHeadingTag = computed(() => props.headingLevel);

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
        class="aspect-video h-full shrink-0 self-stretch overflow-hidden bg-elevated"
        :style="{ viewTransitionName: newsCoverTransitionName(props.article.slug) }"
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
      <component
        :is="titleHeadingTag"
        class="min-w-0 flex-1 self-center text-base font-semibold leading-snug tracking-tight text-highlighted line-clamp-5"
      >
        {{ props.article.title }}
      </component>
    </div>

    <div v-else class="flex w-full min-w-0 items-center justify-between gap-x-3">
      <component
        :is="titleHeadingTag"
        class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-highlighted"
      >
        {{ props.article.title }}
      </component>
      <p class="shrink-0 text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(props.article.createdAt)) }}
      </p>
    </div>
  </SListItem>
</template>
