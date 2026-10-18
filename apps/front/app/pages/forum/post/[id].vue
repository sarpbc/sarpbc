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
    <SCard v-if="pending" flush-top flush-bottom aria-live="polite">
      <div class="flex h-row items-center justify-between gap-3 border-y border-default px-3">
        <USkeleton class="h-3 w-48" />
        <USkeleton class="h-3 w-32" />
      </div>
      <div class="flex min-h-row items-center border-b border-default px-3">
        <USkeleton class="h-3 w-2/3" />
      </div>
    </SCard>

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
      <SCard flush-top flush-bottom class="h-row-grid">
        <div class="flex h-row items-center justify-between gap-3 border-y border-default px-3">
          <h1 class="min-w-0 truncate text-sm font-semibold text-default">
            {{ post.title }}
          </h1>
          <div class="flex shrink-0 items-center gap-3 text-xs text-muted">
            <span>{{ post.author }}</span>
            <time :datetime="new Date(post.createdAt).toISOString()" class="tabular-nums">
              {{ df(locale).format(new Date(post.createdAt)) }}
            </time>
          </div>
        </div>
        <div class="flex min-h-row items-center border-b border-default px-3 py-2">
          <p class="whitespace-pre-wrap text-sm leading-6 text-default">{{ post.content }}</p>
        </div>
      </SCard>

      <DiscussionCommentThread target-type="forumPost" :target-id="postId" />
    </template>
  </SHubPageBody>
</template>
