<script setup lang="ts">
const HOMEPAGE_NEWS_LIMIT = 20;

const allPosts = await queryCollection("news")
  .order("date", "DESC")
  .limit(HOMEPAGE_NEWS_LIMIT)
  .all();

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
    <NewsRow v-for="value in allPosts" :key="value.id" :article="value" />
  </div>
</template>
