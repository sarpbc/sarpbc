<script setup lang="ts">
import { uiLocale } from "@sarpbc/utils";

const appConfig = useAppConfig();
const { locale } = useI18n();

useHead({
  htmlAttrs: {
    lang: computed(() => uiLocale(locale.value)),
  },
  link: [{ href: "/sarpbc.svg", rel: "icon", type: "image/svg+xml" }],
  meta: [
    { charset: "utf-8" },
    { content: "width=device-width, initial-scale=1", name: "viewport" },
  ],
});
</script>

<template>
  <UApp :toaster="appConfig.toaster" :scroll-body="false">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
