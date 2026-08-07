<script setup lang="ts">
const HOMEPAGE_NEWS_LIMIT = 20;

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

setPageSeo({
  title: t("page.home.seo.title"),
  description: t("page.home.seo.description"),
});

const { data: newsPage } = await useAsyncData("homepage-news", () =>
  getNewsArticles(0, HOMEPAGE_NEWS_LIMIT),
);

const posts = computed(() => newsPage.value?.data ?? []);

const { data: activePickemTournament } = await useLazyAsyncData(
  "active-pickem-tournament",
  async () => {
    const tournaments = await getActivePickemTournaments(1);
    return tournaments[0] ?? null;
  },
);
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <PickemPromoBanner
      v-if="activePickemTournament"
      :tournament="activePickemTournament"
      variant="homepage"
      class="mb-2"
    />
    <MatchMobileHomeStrip />
    <UiRail v-if="posts.length" :title="$t('general.news')">
      <UiCard flush-bottom>
        <div class="w-full flex flex-col">
          <NewsRow
            v-for="(article, index) in posts"
            :key="article.id"
            :article="article"
            :priority="index === 0"
          />
        </div>
      </UiCard>
    </UiRail>
  </div>
</template>
