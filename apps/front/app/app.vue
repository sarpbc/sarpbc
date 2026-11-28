<script setup lang="ts">
import { uiLocale } from "@sarpbc/utils";

const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const colorMode = useColorMode();

setPageSeo();

useSearchAgentTool();

useHead({
  htmlAttrs: {
    lang: computed(() => uiLocale(locale.value)),
  },
  link: [{ href: "/favicon.ico", rel: "icon" }],
  meta: [
    {
      content: computed(() => (colorMode.value === "dark" ? "#020305" : "#ffffff")),
      name: "theme-color",
    },
  ],
});
</script>

<template>
  <SToaster>
    <NuxtLoadingIndicator color="var(--ui-primary)" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </SToaster>
</template>
