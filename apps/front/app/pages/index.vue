<script setup lang="ts">
const allPosts = await queryCollection("news").order("date", "DESC").all();

const { data: activePickemTournaments } = await useLazyAsyncData("active-pickem-tournaments", () =>
  getActivePickemTournaments(5),
);
</script>

<template>
  <div class="w-full flex flex-col gap-2 md:pt-18">
    <PickemPromoBanner
      v-for="tournament in activePickemTournaments"
      :key="tournament.id"
      :tournament="tournament"
      variant="homepage"
      class="mb-2"
    />
    <NewsRow v-for="value in allPosts" :key="value.id" :article="value" />
  </div>
</template>
