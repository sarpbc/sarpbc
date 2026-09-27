<script lang="ts" setup>
import type { PostShort } from "~/types/forum";

interface Props {
  post: PostShort;
}

const { post } = defineProps<Props>();
</script>

<template>
  <SListItem
    size="default"
    divider
    :to="$localePath(`/forum/post/${post.id}`)"
    class="min-w-0 gap-3"
  >
    <h3 class="min-w-0 flex-1 truncate text-sm font-medium text-default">
      {{ post.title }}
    </h3>
    <span class="hidden w-32 shrink-0 truncate text-xs text-muted sm:block">
      {{ post.author }}
    </span>
    <span class="flex w-10 shrink-0 justify-end">
      <DiscussionCommentCount :count="post.commentCount ?? 0" />
    </span>
    <span class="w-24 shrink-0 truncate text-end text-xs text-muted tabular-nums sm:w-28">
      {{ formatLocaleTimeAgo(new Date(post.createdAt)) }}
    </span>
  </SListItem>
</template>
