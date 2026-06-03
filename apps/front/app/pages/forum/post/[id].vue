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

const displayReply = ref(false);

function toggleDisplayReply() {
  displayReply.value = !displayReply.value;
}

function refreshPost() {
  refresh();
}
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

    <section v-else class="mt-18 w-full flex flex-col">
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

            <div class="flex flex-row items-center gap-1">
              <UButton
                size="sm"
                variant="soft"
                :label="$t('components.reply.submit')"
                icon="i-fluent-arrow-reply-24-regular"
                class="p-1! gap-1! cursor-pointer"
                @click="toggleDisplayReply"
              />
            </div>
          </div>
        </div>
      </UiCrossCard>

      <div class="flex flex-col mt-8 gap-2">
        <div v-if="displayReply" class="flex flex-col border border-default">
          <ForumReplyCreate :post-id="postId" @reply-created="refreshPost" />
        </div>

        <div class="flex flex-col gap-2">
          <ForumReply
            v-for="reply in post.replies"
            :key="reply.id"
            :reply="reply"
            :post-id="postId"
            @reply-created="refreshPost"
          />
        </div>
      </div>
    </section>
  </div>
</template>
