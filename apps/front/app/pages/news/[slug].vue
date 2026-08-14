<script setup lang="ts">
import { newsCoverTransitionName } from "~/utils/newsCoverTransition";

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
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

const contentPlain = article.value.content
  .replace(/[#>*_`[\]()!\\-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

setPageSeo({
  title: `${article.value.title} | sarpbc.org`,
  description:
    contentPlain.slice(0, 160) || "Read the latest Rocket League esports news on sarpbc.org",
  image: article.value.imageUrl ?? undefined,
});
</script>

<template>
  <div v-if="article" class="w-full flex flex-col gap-4">
    <SCrossCard class="w-full">
      <div class="w-full flex flex-col gap-4 p-4">
        <h1 class="text-2xl font-bold tracking-tight text-highlighted">
          {{ article.title }}
        </h1>
        <div class="flex w-full flex-row items-center justify-between gap-3 text-xs text-muted">
          <p v-if="article.author">{{ article.author }}</p>
          <span v-else aria-hidden="true" />
          <p class="shrink-0 tabular-nums">
            {{ df(locale).format(new Date(article.createdAt)) }}
          </p>
        </div>
        <div
          v-if="article.imageUrl"
          class="w-full overflow-hidden rounded-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
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
        <MDC
          :value="article.content"
          class="news-prose text-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-highlighted [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_h3]:font-medium [&_h3]:text-highlighted [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_a]:text-highlighted [&_a]:hover:text-primary [&_a]:font-medium [&_strong]:text-highlighted [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm [&_th]:border [&_th]:border-default [&_th]:bg-elevated [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-highlighted [&_td]:border [&_td]:border-default [&_td]:px-3 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-default"
        />
      </div>
    </SCrossCard>

    <DiscussionCommentThread target-type="newsArticle" :target-id="article.id" />
  </div>
</template>
