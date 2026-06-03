<script lang="ts" setup>
import type { PostShort } from "~/types/forum";

interface Props {
  post: PostShort;
}

const { post } = defineProps<Props>();
</script>

<template>
  <ULink :to="$localePath(`/forum/post/${post.id}`)" class="block group border border-default p-2">
    <div class="w-full grid grid-cols-10 items-center gap-1">
      <h3 class="col-span-7 md:col-span-6 truncate">
        {{ post.title }}
      </h3>
      <div class="grid grid-cols-2 col-span-3 md:col-span-4 text-sm gap-1 items-center text-start">
        <span class="hidden md:flex md:col-span-1 truncate">
          {{ post.author }}
        </span>
        <span class="flex col-span-2 md:col-span-1 truncate justify-end md:justify-start">
          {{ formatLocaleTimeAgo(new Date(post.createdAt)) }}
        </span>
      </div>
    </div>
  </ULink>
</template>
