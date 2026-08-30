<script setup lang="ts">
const config = useRuntimeConfig();
</script>

<template>
  <div class="flex h-svh max-h-svh w-full flex-col bg-default">
    <UButton
      icon="fluent:dismiss-24-regular"
      :to="config.public.publicSiteUrl"
      variant="ghost"
      color="neutral"
      class="absolute top-4 left-4"
      size="lg"
      :aria-label="$t('page.nav.backToSite')"
    />
    <slot />
  </div>
</template>
