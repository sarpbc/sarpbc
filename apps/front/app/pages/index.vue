<script setup lang="ts">
import { buildOrganization } from "~/utils/structuredData/organization";
import { buildWebSite } from "~/utils/structuredData/web-site";
import { buildNewsFeed } from "~/utils/news-feed";

const HOMEPAGE_NEWS_LIMIT = 30;

const { locale, t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { setJsonLd } = useStructuredData();

setPageSeo({
  description: t("page.home.seo.description"),
  title: t("page.home.seo.title"),
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
const hasMoreNews = computed(() => (newsPage.value?.total ?? 0) > newsItems.value.length);
const hasNews = computed(() => feed.value.length > 0);

const loadMoreNews = () => {
  if (!hasMoreNews.value || newsPending.value) {
    return;
  }

  newsLimit.value += HOMEPAGE_NEWS_LIMIT;
};

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
        <HubRail
          :caption="activePickemTournament ? 'section' : 'lead'"
          :title="$t('page.home.latest')"
        >
          <HubCard>
            <template v-for="entry in feed">
              <NewsWeekRow
                v-if="entry.kind === 'shortWeek'"
                :key="`week-${entry.week}`"
                :week="entry.week"
                :latest="entry.latest"
              />
              <NewsRow v-else :key="entry.article.id" :article="entry.article" />
            </template>
            <SbButton
              v-if="hasMoreNews"
              variant="tertiary"
              block
              class="row-separator h-row justify-start px-2"
              :loading="newsPending"
              :label="newsPending ? $t('common.loading') : $t('page.home.loadMore')"
              @click="loadMoreNews"
            />
          </HubCard>
        </HubRail>
      </template>
      <HubRail
        v-else
        :caption="activePickemTournament ? 'none' : 'lead'"
        :title="activePickemTournament ? undefined : $t('page.home.latest')"
      >
        <HubCard class="flex min-h-row-stack h-row-grid items-center">
          <SbErrorState v-if="newsError" :message="$t('page.home.error')" @retry="refreshNews()" />
          <SbEmptyState
            v-else
            icon="i-fluent-news-24-regular"
            :title="$t('page.home.empty')"
            :hint="$t('page.home.emptyHint')"
          />
        </HubCard>
      </HubRail>
      <OnThisDayBlock :limit="5" />
      <TransferLatest class="md:hidden" />
    </div>
  </div>
</template>
