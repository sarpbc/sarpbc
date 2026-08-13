<script lang="ts" setup>
import type { Locale } from "vue-i18n";

type GameLocale = "en" | "fr";

const OPTIONS: {
  code: GameLocale;
  labelKey: "components.header.languageEn" | "components.header.languageFr";
}[] = [
  { code: "en", labelKey: "components.header.languageEn" },
  { code: "fr", labelKey: "components.header.languageFr" },
];

const { locale, setLocale, t } = useI18n();

const current = computed(() => locale.value as GameLocale);

async function select(code: GameLocale) {
  if (code === current.value) return;
  await setLocale(code as Locale);
}
</script>

<template>
  <div
    class="ml-auto flex items-center"
    role="radiogroup"
    :aria-label="t('components.header.language')"
  >
    <template v-for="(option, index) in OPTIONS" :key="option.code">
      <span v-if="index > 0" class="text-xs text-dimmed" aria-hidden="true">/</span>
      <button
        type="button"
        role="radio"
        :aria-checked="current === option.code"
        :aria-label="t(option.labelKey)"
        class="px-1.5 py-1 text-xs font-medium tracking-wider"
        :class="current === option.code ? 'text-highlighted' : 'text-muted hover:text-highlighted'"
        @click="select(option.code)"
      >
        {{ option.code.toUpperCase() }}
      </button>
    </template>
  </div>
</template>
