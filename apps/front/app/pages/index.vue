<script setup lang="ts">
import { buildOrganization } from "~/utils/structuredData/organization";
import { buildWebSite } from "~/utils/structuredData/webSite";
import { buildNewsFeed } from "~/utils/newsFeed";

const HOMEPAGE_NEWS_LIMIT = 30;

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

const newsLimit = ref(HOMEPAGE_NEWS_LIMIT);

const {
  data: newsPage,
  pending: newsPending,
  error: newsError,
  refresh: refreshNews,
} = await useAsyncData(
  () => `homepage-news-${locale.value}`,
  () => getNewsArticles(0, newsLimit.value, locale.value),
  { watch: [locale, newsLimit] },
);

const newsItems = computed(() => newsPage.value?.data ?? []);
const feed = computed(() => buildNewsFeed(newsItems.value));
const featuredArticle = computed(() => {
  const entry = feed.value.find((item) => item.kind === "article");
  return entry?.kind === "article" ? entry.article : null;
});
const listedEntries = computed(() =>
  feed.value.filter(
    (entry) => entry.kind !== "article" || entry.article.id !== featuredArticle.value?.id,
  ),
);
const hasMoreNews = computed(() => (newsPage.value?.total ?? 0) > newsItems.value.length);
const hasNews = computed(() => feed.value.length > 0);

function loadMoreNews() {
  if (!hasMoreNews.value || newsPending.value) {
    return;
  }
  newsLimit.value += HOMEPAGE_NEWS_LIMIT;
}

const { data: activePickemTournament } = await useLazyAsyncData(
  "active-pickem-tournament",
  async () => {
    const tournaments = await getActivePickemTournaments(1);
    return tournaments[0] ?? null;
  },
);
</script>

<template>
  <div class="w-full flex flex-col">
    <h1 class="sr-only">{{ $t("page.home.seo.heading") }}</h1>
    <MatchMobileHomeStrip />
    <div class="w-full flex flex-col" :class="{ 'gap-4': Boolean(activePickemTournament) }">
      <PickemPromoBanner
        v-if="activePickemTournament"
        :tournament="activePickemTournament"
        variant="homepage"
      />
      <template v-if="hasNews">
        <SRail v-if="featuredArticle" :caption="activePickemTournament ? 'none' : 'lead'">
          <NewsFeature :article="featuredArticle" />
        </SRail>
        <SRail
          :caption="featuredArticle || activePickemTournament ? 'section' : 'lead'"
          :title="$t('page.home.latest')"
          :class="featuredArticle ? 'mt-8' : undefined"
        >
          <SCard>
            <template v-for="entry in listedEntries">
              <NewsWeekRow
                v-if="entry.kind === 'shortWeek'"
                :key="`week-${entry.week}`"
                :week="entry.week"
                :latest="entry.latest"
              />
              <NewsRow v-else :key="entry.article.id" :article="entry.article" />
            </template>
            <button
              v-if="hasMoreNews"
              type="button"
              class="interactive-surface row-separator flex h-row w-full items-center gap-2 px-2 text-left text-sm font-normal text-muted hover:text-highlighted disabled:cursor-default"
              :disabled="newsPending"
              @click="loadMoreNews"
            >
              <UIcon
                v-if="newsPending"
                name="i-fluent-arrow-clockwise-24-regular"
                class="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
              {{ newsPending ? $t("common.loading") : $t("page.home.loadMore") }}
            </button>
          </SCard>
        </SRail>
      </template>
      <SRail
        v-else
        :caption="activePickemTournament ? 'none' : 'lead'"
        :title="activePickemTournament ? undefined : $t('page.home.latest')"
      >
        <SCard class="flex min-h-row-stack h-row-grid items-center">
          <SErrorState v-if="newsError" :message="$t('page.home.error')" @retry="refreshNews()" />
          <SEmptyState
            v-else
            icon="i-fluent-news-24-regular"
            :title="$t('page.home.empty')"
            :hint="$t('page.home.emptyHint')"
          />
        </SCard>
      </SRail>
      <TransferLatest class="md:hidden" />
    </div>
  </div>
</template>
