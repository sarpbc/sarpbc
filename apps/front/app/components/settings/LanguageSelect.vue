<script lang="ts" setup>
import { useI18n, type Locale } from "vue-i18n";

type LanguageOption = {
  value: Locale;
  label: string;
};

const languages: LanguageOption[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

const { locale, setLocale, t } = useI18n();
const selectedLanguage = ref(locale.value);

async function handleLanguageChange(payload: boolean | string | number | undefined) {
  if (typeof payload !== "string") {
    return;
  }
  await setLocale(payload as Locale);
  window.location.reload();
}
</script>

<template>
  <USelect
    v-model="selectedLanguage"
    value-key="value"
    label-key="label"
    :items="languages"
    :aria-label="t('components.settings.language.label')"
    class="w-48"
    @update:model-value="handleLanguageChange"
  />
</template>
