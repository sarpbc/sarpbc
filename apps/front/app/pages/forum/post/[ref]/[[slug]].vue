<script lang="ts" setup>
import { forumPostPath } from "@sarpbc/utils";

const route = useRoute();
const localePath = useLocalePath();
const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const postRef = computed(() => route.params.ref as string);

const {
  data: post,
  pending,
  error,
  refresh,
} = await useAsyncData(
  () => `forum-post-${postRef.value}`,
  () => getPostById(postRef.value),
  {
    watch: [postRef],
    // Nuxt's `pick` throws on a null result, which would turn a missing post into a 500.
    transform: (post) =>
      post && {
        id: post.id,
        publicId: post.publicId,
        slug: post.slug,
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: post.createdAt,
      },
  },
);

if (!post.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.forum.post.postNotFound"),
    failed: t("page.forum.post.failedToLoadPostData"),
  });
}

const { publicId, slug } = post.value;
const canonicalPath = localePath(forumPostPath(publicId, slug));
if (route.path !== canonicalPath) {
  await navigateTo(
    { path: canonicalPath, query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
}

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

watch(
  [title, description],
  () => {
    setPageSeo({ title: title.value, description: description.value });
  },
  { immediate: true },
);
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

    <template v-else-if="post">
      <SCard flush-top flush-bottom class="h-row-grid">
        <div class="flex h-row items-center justify-between gap-3 border-y border-default px-3">
          <h1 class="min-w-0 truncate text-sm font-medium text-default">
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

      <DiscussionCommentThread target-type="forumPost" :target-id="post.id" />
    </template>
  </SHubPageBody>
</template>
