<script lang="ts" setup>
import { uiLocale } from "@sarpbc/utils";
import type { UiLocale } from "@sarpbc/utils";
import type { TextToggleOption } from "~/components/s/TextToggle.vue";

const { locale, setLocale, t } = useI18n();

const options = computed<TextToggleOption<UiLocale>[]>(() => [
  { ariaLabel: t("components.header.languageEn"), label: "EN", value: "en" },
  { ariaLabel: t("components.header.languageFr"), label: "FR", value: "fr" },
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
