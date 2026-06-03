<script setup lang="ts">
const allPosts = await queryCollection("news").order("date", "DESC").all();
</script>

<template>
  <div class="w-full flex flex-col gap-2 md:pt-18">
    <NewsRow v-for="value in allPosts" :key="value.id" :article="value" />
  </div>
</template>
