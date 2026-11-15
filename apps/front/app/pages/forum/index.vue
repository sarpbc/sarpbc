<script lang="ts" setup>
import { getPosts } from "~/composables/forum";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  description: t("page.forum.index.description"),
  title: t("page.forum.index.title"),
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
    <HubPageHeader>
      <template #title>{{ t("page.forum.index.pageTitle") }}</template>
      <template v-if="posts?.length" #meta>
        <span>{{ t("page.hub.headers.forumPosts", { count: posts.length }) }}</span>
      </template>
    </HubPageHeader>
    <HubCard v-if="pending && !posts?.length" aria-live="polite">
      <HubListItem v-for="index in 4" :key="index" size="default" class="gap-3">
        <SbSkeleton class="h-3 w-48" />
        <SbSkeleton class="ml-auto h-3 w-20" />
      </HubListItem>
    </HubCard>
    <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SbErrorState :message="t('page.forum.index.error')" @retry="refresh()" />
    </HubCard>
    <HubCard v-else-if="posts?.length">
      <ForumPostCard v-for="post in posts" :key="post.id" :post="post" />
    </HubCard>
    <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
      <SbEmptyState
        icon="i-fluent-chat-multiple-24-regular"
        :title="t('page.forum.index.noPosts')"
        :hint="t('page.forum.index.emptyHint')"
      >
        <SbButton variant="secondary" :to="localePath('/forum/new')">
          {{ t("page.forum.index.createNewPost") }}
        </SbButton>
      </SbEmptyState>
    </HubCard>
  </div>
</template>
