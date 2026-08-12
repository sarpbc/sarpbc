<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const {
  offset,
  pending,
  error,
  refresh,
  pastMatches,
  totalMatches,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  getPageQuery,
} = useResultsListPage();

setPageSeo({
  title: t("page.results.seo.title"),
  description: t("page.results.seo.description"),
});
</script>

<template>
  <MatchListDirectory
    kind="results"
    :pending="pending"
    :has-error="Boolean(error)"
    :matches="pastMatches"
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
