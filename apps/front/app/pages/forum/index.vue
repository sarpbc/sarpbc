<script lang="ts" setup>
import { getPosts } from "~/composables/forum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  title: t("page.forum.index.title"),
  description: t("page.forum.index.description"),
});

const localePath = useLocalePath();

const {
  data: posts,
  pending,
  error,
  refresh,
} = await useLazyAsyncData("forum-posts", () => getPosts());
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.forum.index.pageTitle") }}</template>
      <template v-if="posts?.length" #meta>
        <span>{{ t("page.hub.headers.forumPosts", { count: posts.length }) }}</span>
      </template>
    </SHubPageHeader>
    <SCard v-if="pending && !posts?.length" flush-bottom aria-live="polite">
      <SListItem v-for="index in 4" :key="index" size="default" divider class="gap-3">
        <USkeleton class="h-3 w-48" />
        <USkeleton class="ml-auto h-3 w-20" />
      </SListItem>
    </SCard>
    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.forum.index.error')" @retry="refresh()" />
    </SCard>
    <SCard v-else-if="posts?.length" flush-bottom>
      <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
    </SCard>
    <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState
        icon="i-fluent-chat-multiple-24-regular"
        :title="t('page.forum.index.noPosts')"
        :hint="t('page.forum.index.emptyHint')"
      >
        <UButton color="neutral" variant="outline" :to="localePath('/forum/new')">
          {{ t("page.forum.index.createNewPost") }}
        </UButton>
      </SEmptyState>
    </SCard>
  </div>
</template>
