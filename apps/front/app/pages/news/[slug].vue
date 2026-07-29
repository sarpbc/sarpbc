<script setup lang="ts">
import { newsMdcComponents } from "~/utils/newsMdcComponents";

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: article } = await useAsyncData(
  () => `news-${slug.value}`,
  () => getNewsArticle(slug.value),
  { watch: [slug] },
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
});
</script>

<template>
  <div v-if="article" class="w-full flex flex-col gap-4">
    <UiCrossCard class="w-full">
      <div class="w-full flex flex-col gap-2 p-4">
        <div class="w-full flex flex-col h-16 justify-center gap-1">
          <h1 class="text-highlighted text-2xl font-bold">
            {{ article.title }}
          </h1>
          <span
            v-if="article.author"
            class="flex flex-row justify-between text-xs font-normal text-muted"
          >
            <p>{{ article.author }}</p>
            <p>{{ df(locale).format(new Date(article.createdAt)) }}</p>
          </span>
        </div>
        <MDC
          :value="article.content"
          :components="newsMdcComponents"
          class="news-prose text-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-highlighted [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_h3]:font-medium [&_h3]:text-highlighted [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_a]:text-highlighted [&_a]:hover:text-primary [&_a]:font-medium [&_strong]:text-highlighted"
        />
      </div>
    </UiCrossCard>

    <DiscussionCommentThread target-type="newsArticle" :target-id="article.id" />
  </div>
</template>
