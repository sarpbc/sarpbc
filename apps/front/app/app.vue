<script setup lang="ts">
import { uiComponentDefaults } from "~/config/ui-component-defaults";

const appConfig = useAppConfig();
const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const colorMode = useColorMode();

setPageSeo();

useHead({
  meta: [
    {
      name: "theme-color",
      content: computed(() => (colorMode.value === "dark" ? "#020305" : "#ffffff")),
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
