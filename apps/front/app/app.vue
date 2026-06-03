<script setup lang="ts">
import { en, fr } from "@nuxt/ui/locale";

const appConfig = useAppConfig();
const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const uiLocale = computed(() => (locale.value.toLowerCase().startsWith("fr") ? fr : en));

setPageSeo();

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: computed(() => (locale.value === "fr" ? "fr" : "en")),
  },
});
</script>

<template>
  <UApp :toaster="appConfig.toaster" :locale="uiLocale">
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </UApp>
</template>
