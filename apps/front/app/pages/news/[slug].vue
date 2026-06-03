<script setup lang="ts">
const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const slug = useRoute().params.slug;

const { data: article } = await useAsyncData(`news-${slug}`, () => {
  return queryCollection("news").path(`/news/${slug}`).first();
});

setPageSeo({
  title: article.value?.title ? `${article.value.title} | Sarpbc` : t("page.news.title"),
  description:
    article.value?.description || "Read the latest Rocket League esports news on Sarpbc.org",
  image: article.value?.image || undefined,
});
</script>

<template>
  <div class="w-full flex flex-col">
    <UiCrossCard v-if="article" class="w-full">
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
            <p>{{ df(locale).format(new Date(article.date)) }}</p>
          </span>
        </div>
        <ContentRenderer :value="article" :prose="true" />
      </div>
    </UiCrossCard>
    <div v-else class="pt-16">
      <div class="w-full flex justify-center items-center p-4 border border-default">
        <span class="text-highlighted font-bold text-2xl">
          {{ $t("page.news.articleNotFound") }}
        </span>
      </div>
    </div>
  </div>
</template>
