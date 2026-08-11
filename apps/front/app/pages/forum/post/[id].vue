<script lang="ts" setup>
const route = useRoute();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const postId = computed(() => route.params.id as string);

const {
  data: post,
  pending,
  error,
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
  <div class="w-full flex flex-col">
    <UiCrossCard v-if="pending" class="mt-18 h-22.75">
      <div class="size-full flex flex-col justify-center items-center text-muted">
        <UIcon name="i-ep-loading" class="animate-spin size-5.5" />
        {{ $t("page.forum.post.loadingPost") }}
      </div>
    </UiCrossCard>

    <div v-else-if="error || !post" class="w-full flex flex-col items-center py-16 text-center">
      <h1 class="text-2xl font-bold text-error mb-4">
        {{ $t("page.forum.post.errorLoadingPost") }}
      </h1>
      <p class="text-muted mb-6">
        {{ $t("page.forum.post.failedToLoadPostData") }}
      </p>
      <UButton to="/forum">
        {{ $t("page.forum.post.goBackToForum") }}
      </UButton>
    </div>

    <section v-else class="mt-18 w-full flex flex-col gap-8">
      <UiCrossCard class="w-full">
        <div class="w-full flex flex-col">
          <div class="flex flex-row items-center justify-between border-b border-default px-4 py-2">
            <h1 class="text-lg font-semibold text-toned">
              {{ post.title }}
            </h1>

            <span class="font-medium text-muted text-sm">
              {{ post.author }}
            </span>
          </div>

          <div class="text-toned whitespace-pre-wrap leading-relaxed p-4">
            {{ post.content }}
          </div>
          <div class="flex flex-row items-center justify-between border-t border-default px-4 h-8">
            <span class="font-light text-muted text-sm">
              {{ df(locale).format(new Date(post.createdAt)) }}
            </span>
          </div>
        </div>
      </UiCrossCard>

      <DiscussionCommentThread target-type="forumPost" :target-id="postId" />
    </section>
  </div>
</template>
