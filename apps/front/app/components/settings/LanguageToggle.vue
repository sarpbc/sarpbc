<script lang="ts" setup>
import { uiLocale, type UiLocale } from "@sarpbc/utils";
import type { TextToggleOption } from "~/components/s/TextToggle.vue";

const { locale, setLocale, t } = useI18n();

const options = computed<TextToggleOption<UiLocale>[]>(() => [
  { value: "en", label: "EN", ariaLabel: t("components.header.languageEn") },
  { value: "fr", label: "FR", ariaLabel: t("components.header.languageFr") },
]);

const current = computed<UiLocale>({
  get: () => uiLocale(locale.value),
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
