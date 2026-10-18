<script lang="ts" setup>
import type { TextToggleOption } from "~/components/s/TextToggle.vue";

type GameLocale = "en" | "fr";

const { locale, setLocale, t } = useI18n();

const options = computed<TextToggleOption<GameLocale>[]>(() => [
  { value: "en", label: "EN", ariaLabel: t("components.header.languageEn") },
  { value: "fr", label: "FR", ariaLabel: t("components.header.languageFr") },
]);

const current = computed<GameLocale>({
  get: () => (locale.value === "fr" ? "fr" : "en"),
  set: (code) => {
    if (code !== locale.value) {
      void setLocale(code);
    }
  },
});
</script>

<template>
  <STextToggle v-model="current" :options="options" :ariaLabel="t('components.header.language')" />
</template>
