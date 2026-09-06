<script setup lang="ts">
import {
  NEWS_SEO_DESCRIPTION_MAX_LENGTH,
  excerptFromNewsContent,
  readingTimeMinutes,
} from "@sarpbc/utils";
import { newsCoverTransitionName } from "~/utils/newsCoverTransition";
import { NEWS_PROSE_CLASS } from "~/utils/newsProseClass";
import { resolveNewsType } from "~/utils/newsTypeQuery";
import { buildNewsArticleJsonLd } from "~/utils/structuredData/newsArticle";

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();
const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: article } = await useAsyncData(
  () => `news-${slug.value}-${locale.value}`,
  () => getNewsArticle(slug.value, locale.value),
  { watch: [slug, locale] },
);

if (!article.value) {
  throw createError({
    statusCode: 404,
    message: t("page.news.articleNotFound"),
  });
}

const newsType = computed(() => resolveNewsType(article.value?.type));
const minutes = computed(() => readingTimeMinutes(article.value?.content ?? ""));

const seoTitle = computed(() => t("page.news.seoTitle", { title: article.value?.title ?? "" }));

const seoDescription = computed(() => {
  const excerpt = excerptFromNewsContent(
    article.value?.content ?? "",
    NEWS_SEO_DESCRIPTION_MAX_LENGTH,
  );
  return excerpt || t("page.news.seoDescriptionDefault");
});

watch(
  [seoTitle, seoDescription, () => article.value?.imageUrl],
  () => {
    setPageSeo({
      title: seoTitle.value,
      description: seoDescription.value,
      image: article.value?.imageUrl ?? undefined,
    });
  },
  { immediate: true },
);

setJsonLd("ld-json-news-article", () => {
  if (!article.value) {
    return null;
  }
  return buildNewsArticleJsonLd({
    title: article.value.title,
    slug: article.value.slug,
    createdAt: article.value.createdAt,
    content: article.value.content,
    author: article.value.author,
    imageUrl: article.value.imageUrl,
  });
});
</script>

<template>
  <SHubPageBody v-if="article">
    <SCard v-if="newsType === 'article'" class="w-full overflow-hidden">
      <div
        v-if="article.imageUrl"
        class="aspect-[2/1] w-full overflow-hidden bg-elevated"
        :style="{ viewTransitionName: newsCoverTransitionName(article.slug) }"
      >
        <NuxtImg
          :src="article.imageUrl"
          :alt="article.title"
          width="1200"
          height="600"
          sizes="(max-width: 768px) 100vw, 768px"
          class="h-full w-full object-cover"
        />
      </div>
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-8">
        <div class="flex w-full flex-col gap-2">
          <h1
            class="text-3xl font-semibold tracking-tight text-highlighted md:text-4xl text-balance"
          >
            {{ article.title }}
          </h1>
          <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <p v-if="article.author">{{ article.author }}</p>
            <p class="tabular-nums">{{ df(locale).format(new Date(article.createdAt)) }}</p>
            <p>{{ t("page.news.readingTime", { minutes: minutes }) }}</p>
          </div>
        </div>
        <MDC :value="article.content" :class="[NEWS_PROSE_CLASS, 'text-lg leading-relaxed']" />
      </div>
    </SCard>

    <SCard v-else class="w-full flex flex-col gap-4 p-4">
      <div class="flex w-full flex-col gap-1">
        <h1 class="text-4xl font-bold tracking-tight text-highlighted">
          {{ article.title }}
        </h1>
        <div class="flex w-full flex-row items-center justify-between gap-3 text-xs text-muted">
          <p v-if="article.author">{{ article.author }}</p>
          <span v-else aria-hidden="true" />
          <p class="shrink-0 tabular-nums">
            {{ df(locale).format(new Date(article.createdAt)) }}
          </p>
        </div>
      </div>
      <div
        v-if="article.imageUrl"
        class="w-full overflow-hidden rounded-sm"
        :style="{ viewTransitionName: newsCoverTransitionName(article.slug) }"
      >
        <NuxtImg
          :src="article.imageUrl"
          :alt="article.title"
          width="1200"
          height="630"
          sizes="(max-width: 768px) 100vw, 768px"
          class="w-full max-h-96 object-cover"
        />
      </div>
      <MDC :value="article.content" :class="NEWS_PROSE_CLASS" />
    </SCard>

    <DiscussionCommentThread
      v-if="newsType === 'article'"
      target-type="newsArticle"
      :target-id="article.id"
    />
  </SHubPageBody>
</template>
