<script setup lang="ts">
const config = useRuntimeConfig();
</script>

<template>
  <div class="flex h-svh max-h-svh w-full flex-col bg-default">
    <SbButton
      icon="fluent:dismiss-24-regular"
      :to="config.public.publicSiteUrl"
      variant="tertiary"
      class="absolute top-4 left-4"
      :aria-label="$t('page.nav.backToSite')"
    />
    <slot />
  </div>
</template>
