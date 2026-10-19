<script setup lang="ts">
const appConfig = useAppConfig();
const { locale } = useI18n();

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [{ rel: "icon", type: "image/svg+xml", href: "/sarpbc.svg" }],
  htmlAttrs: {
    lang: computed(() => (locale.value === "fr" ? "fr" : "en")),
  },
});
</script>

<template>
  <UApp :toaster="appConfig.toaster" :scroll-body="false">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
