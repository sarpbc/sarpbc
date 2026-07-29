<script setup lang="ts">
const HOMEPAGE_NEWS_LIMIT = 20;

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
  <div class="w-full flex flex-col gap-2 md:pt-18">
    <PickemPromoBanner
      v-if="activePickemTournament"
      :tournament="activePickemTournament"
      variant="homepage"
      class="mb-2"
    />
    <NewsRow v-for="article in posts" :key="article.id" :article="article" />
  </div>
</template>
