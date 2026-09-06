<script lang="ts" setup>
import type { NewsType } from "@sarpbc/types";
import type { NewsArticleListItem } from "~/composables/news";
import { newsCoverTransitionName } from "~/utils/newsCoverTransition";
import { resolveNewsType } from "~/utils/newsTypeQuery";

const localePath = useLocalePath();

const props = defineProps<{
  article: NewsArticleListItem;
  dividerTop?: boolean;
}>();

const newsType = computed(() => resolveNewsType(props.article.type));
const imageUrl = computed(() => props.article.imageUrl?.trim() || null);

const rowSize = computed(() => {
  const type: NewsType = newsType.value;
  switch (type) {
    case "short":
      return "default" as const;
    case "article":
      return imageUrl.value ? ("double" as const) : ("default" as const);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <SListItem
    :size="rowSize"
    divider
    :divider-top="props.dividerTop"
    :to="localePath(`/news/${props.article.slug}`)"
    class="min-w-0 overflow-hidden"
  >
    <div
      v-if="newsType === 'article' && imageUrl"
      class="flex h-full w-full min-w-0 items-stretch gap-x-3"
    >
      <div
        class="aspect-video h-full shrink-0 self-stretch overflow-hidden bg-elevated"
        :style="{ viewTransitionName: newsCoverTransitionName(props.article.slug) }"
      >
        <NuxtImg
          :src="imageUrl"
          alt=""
          width="128"
          height="72"
          sizes="128px"
          loading="lazy"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <h2
          class="min-w-0 text-base font-semibold leading-snug tracking-tight text-default line-clamp-2"
        >
          {{ props.article.title }}
        </h2>
        <p v-if="props.article.excerpt" class="min-w-0 text-xs text-toned line-clamp-1">
          {{ props.article.excerpt }}
        </p>
        <p class="shrink-0 text-xs font-thin text-muted tabular-nums">
          {{ formatLocaleTimeAgo(new Date(props.article.createdAt)) }}
        </p>
      </div>
    </div>

    <div v-else class="flex w-full min-w-0 items-center justify-between gap-x-3">
      <h2 class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-default">
        {{ props.article.title }}
      </h2>
      <p class="shrink-0 text-xs font-thin text-muted tabular-nums">
        {{ formatLocaleTimeAgo(new Date(props.article.createdAt)) }}
      </p>
    </div>
  </SListItem>
</template>
