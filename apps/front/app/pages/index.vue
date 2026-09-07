<script setup lang="ts">
import { isoWeekIdFromDate } from "@sarpbc/utils";
import { buildOrganization } from "~/utils/structuredData/organization";
import { buildWebSite } from "~/utils/structuredData/webSite";

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

const currentWeekId = isoWeekIdFromDate(new Date());
const articleLimit = ref(HOMEPAGE_NEWS_LIMIT);

const [{ data: weekPage }, { data: articlesPage, pending: articlesPending }] = await Promise.all([
  useAsyncData(
    () => `homepage-week-${locale.value}-${currentWeekId}`,
    () => getNewsWeek(currentWeekId, locale.value),
    { watch: [locale] },
  ),
  useAsyncData(
    () => `homepage-articles-${locale.value}-${articleLimit.value}`,
    () => getNewsArticles(0, articleLimit.value, locale.value, "article"),
    { watch: [locale, articleLimit] },
  ),
]);

const week = computed(() => {
  const value = weekPage.value;
  if (!value || value.items.length === 0) {
    return null;
  }
  return value;
});

const articles = computed(() => articlesPage.value?.data ?? []);
const hasMoreArticles = computed(() => (articlesPage.value?.total ?? 0) > articles.value.length);
const hasArticlesColumn = computed(() => articles.value.length > 0 || hasMoreArticles.value);
const hasNewsColumn = computed(() => Boolean(week.value) || hasArticlesColumn.value);

function loadMoreArticles() {
  if (!hasMoreArticles.value || articlesPending.value) {
    return;
  }
  articleLimit.value += HOMEPAGE_NEWS_LIMIT;
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
    <MatchMobileHomeStrip />
    <div class="w-full flex flex-col" :class="{ 'gap-4': Boolean(activePickemTournament) }">
      <PickemPromoBanner
        v-if="activePickemTournament"
        :tournament="activePickemTournament"
        variant="homepage"
      />
      <SRail
        v-if="hasNewsColumn"
        :caption="activePickemTournament ? 'none' : 'lead'"
        :title="week || activePickemTournament ? undefined : $t('page.home.latest')"
      >
        <SCard v-if="week" flush-bottom>
          <NewsWeekRow :week="week" />
        </SCard>
        <SRail
          v-if="hasArticlesColumn"
          :caption="week ? 'section' : 'none'"
          :title="week ? $t('page.home.latest') : undefined"
        >
          <SCard flush-bottom flush-top>
            <NewsRow
              v-for="(article, index) in articles"
              :key="article.id"
              :article="article"
              :divider-top="!week && index === 0"
            />
            <SListItem v-if="hasMoreArticles" divider>
              <button
                type="button"
                class="flex h-full w-full items-center text-left text-sm font-medium text-muted hover:text-highlighted"
                :disabled="articlesPending"
                @click="loadMoreArticles"
              >
                {{ $t("page.home.allNews") }}
              </button>
            </SListItem>
          </SCard>
        </SRail>
      </SRail>
    </div>
  </div>
</template>
