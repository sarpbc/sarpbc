<script lang="ts" setup>
import { getPosts } from "~/composables/forum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  title: t("page.forum.index.title"),
  description: t("page.forum.index.description"),
});

const { data: posts } = await useLazyAsyncData("forum-posts", () => getPosts());
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-row-header">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ t("page.forum.index.pageTitle") }}
        </h1>
      </div>
    </UiCrossCard>
    <div class="w-full flex flex-col gap-2">
      <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
  </div>
</template>
