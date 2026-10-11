<script lang="ts" setup>
const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const postId = computed(() => route.params.id as string);

const {
  data: post,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(`forum-post-${postId.value}`, () => getPostById(postId.value));

const title = computed(() =>
  post.value?.title
    ? t("page.forum.post.seoTitleWithTitle", { title: post.value.title })
    : t("page.forum.post.seoTitleDefault"),
);

const description = computed(() =>
  post.value?.content
    ? t("page.forum.post.seoDescriptionWithTitle", {
        title: post.value.content.slice(0, 150),
      })
    : t("page.forum.post.seoDescriptionDefault"),
);

setPageSeo({
  title: title.value,
  description: description.value,
});
</script>

<template>
  <SHubPageBody>
    <SCrossCard v-if="pending" class="min-h-row-triple" aria-live="polite">
      <div class="flex w-full flex-col gap-3 p-3">
        <USkeleton class="h-4 w-48" />
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-2/3" />
      </div>
    </SCrossCard>

    <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
      <SErrorState :message="t('page.forum.post.failedToLoadPostData')" @retry="refresh()" />
    </SCard>

    <SCard v-else-if="!post" class="flex min-h-row-stack h-row-grid items-center">
      <SEmptyState
        icon="i-fluent-chat-dismiss-24-regular"
        :title="t('page.forum.post.postNotFound')"
        :hint="t('page.forum.post.postCouldNotBeFound')"
      >
        <UButton variant="outline" color="neutral" :to="$localePath('/forum')">
          {{ t("page.forum.post.goBackToForum") }}
        </UButton>
      </SEmptyState>
    </SCard>

    <template v-else>
      <SCrossCard class="h-row-grid">
        <div class="flex w-full flex-col">
          <div class="flex h-row items-center justify-between gap-3 border-b border-default px-3">
            <h1 class="truncate text-base font-semibold text-toned">
              {{ post.title }}
            </h1>
            <span class="shrink-0 text-sm font-medium text-muted">
              {{ post.author }}
            </span>
          </div>

          <div class="whitespace-pre-wrap p-3 leading-relaxed text-toned">
            {{ post.content }}
          </div>

          <div class="flex h-row items-center border-t border-default px-3">
            <span class="text-sm font-normal text-muted">
              {{ df(locale).format(new Date(post.createdAt)) }}
            </span>
          </div>
        </div>
      </SCrossCard>

      <DiscussionCommentThread target-type="forumPost" :target-id="postId" />
    </template>
  </SHubPageBody>
</template>
