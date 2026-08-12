<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();
const route = useRoute();

if (route.query.tab === "past") {
  await navigateTo({
    path: localePath("/results"),
    query: offsetPageQuery(parseRouteOffset(route.query.offset)),
  });
}

const {
  offset,
  pending,
  error,
  refresh,
  scheduleMatches,
  liveMatchIds,
  totalMatches,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  getPageQuery,
} = useMatchesListPage();

setPageSeo({
  title: t("page.matches.seo.title"),
  description: t("page.matches.seo.description"),
});
</script>

<template>
  <MatchListDirectory
    kind="schedule"
    :pending="pending"
    :has-error="Boolean(error)"
    :matches="scheduleMatches"
    :live-match-ids="liveMatchIds"
    :total-matches="totalMatches"
    :current-page="currentPage"
    :total-pages="totalPages"
    :has-previous="hasPrevious"
    :has-next="hasNext"
    :get-page-query="getPageQuery"
    :offset="offset"
    @retry="refresh()"
  />
</template>
