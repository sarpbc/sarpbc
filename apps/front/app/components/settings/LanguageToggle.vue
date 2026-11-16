<script lang="ts" setup>
import { uiLocale } from "@sarpbc/utils";
import type { UiLocale } from "@sarpbc/utils";
import type { SelectOption } from "@sarpbc/design";

const { locale, setLocale, t } = useI18n();

const options = computed<SelectOption<UiLocale>[]>(() => [
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
  <SRadioGroup
    :model-value="current"
    :items="options"
    orientation="horizontal"
    :aria-label="t('components.header.language')"
    @update:model-value="$event !== null && (current = $event)"
  />
</template>
