<script setup lang="ts">
import { uiLocale } from "@sarpbc/utils";

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
  <SToaster>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </SToaster>
</template>
