<script setup lang="ts">
import { buildOrganization } from "~/utils/structuredData/organization";
import { buildWebSite } from "~/utils/structuredData/webSite";
import { homepageNewsHeadingLevel } from "~/utils/homepageNewsHeadingLevel";

const HOMEPAGE_NEWS_LIMIT = 20;

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

setPageSeo({
  title: t("page.home.seo.title"),
  description: t("page.home.seo.description"),
});

setJsonLd("ld-json-organization", () => buildOrganization());
setJsonLd("ld-json-website", () =>
  buildWebSite({
    description: t("page.home.seo.description"),
  }),
);

const { data: newsPage } = await useAsyncData(
  () => `homepage-news-${locale.value}`,
  () => getNewsArticles(0, HOMEPAGE_NEWS_LIMIT, locale.value),
  { watch: [locale] },
);

const posts = computed(() => newsPage.value?.data ?? []);

const featuredImageArticleId = computed(() => {
  const withImage = posts.value.find((article) => Boolean(article.imageUrl?.trim()));
  return withImage?.id ?? null;
});

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
    <SRail v-if="posts.length" caption="lead" :title="$t('general.news')">
      <SCard flush-bottom>
        <div class="w-full flex flex-col">
          <NewsRow
            v-for="article in posts"
            :key="article.id"
            :article="article"
            :show-image="article.id === featuredImageArticleId"
            :heading-level="homepageNewsHeadingLevel(article.id, featuredImageArticleId)"
          />
        </div>
      </SCard>
    </SRail>
  </div>
</template>
