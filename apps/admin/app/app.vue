<script setup lang="ts">
import { uiLocale } from "@sarpbc/utils";
const appConfig = useAppConfig();
const { locale } = useI18n();

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [{ rel: "icon", type: "image/svg+xml", href: "/sarpbc.svg" }],
  htmlAttrs: {
    lang: computed(() => uiLocale(locale.value)),
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
