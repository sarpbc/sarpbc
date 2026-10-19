<script setup lang="ts">
import { uiComponentDefaults } from "~/config/ui-component-defaults";

const appConfig = useAppConfig();
const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const colorMode = useColorMode();

setPageSeo();

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    {
      name: "theme-color",
      content: computed(() => (colorMode.value === "dark" ? "#010101" : "#ffffff")),
    },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: computed(() => (locale.value === "fr" ? "fr" : "en")),
  },
});
</script>

<template>
  <UApp :toaster="appConfig.toaster" :scroll-body="false">
    <UTheme :props="uiComponentDefaults">
      <NuxtLoadingIndicator color="var(--ui-primary)" :height="2" />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UTheme>
  </UApp>
</template>
