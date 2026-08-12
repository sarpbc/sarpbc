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
    <SHubPageHeader>
      <template #title>{{ t("page.forum.index.pageTitle") }}</template>
      <template v-if="posts?.length" #meta>
        <span>{{ t("page.hub.headers.forumPosts", { count: posts.length }) }}</span>
      </template>
    </SHubPageHeader>
    <div class="w-full flex flex-col gap-2">
      <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
  </div>
</template>
