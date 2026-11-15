<script setup lang="ts">
import type { NuxtError } from "#app";

const { error } = defineProps<{ error: NuxtError }>();

const { t } = useI18n();
const localePath = useLocalePath();

const heading = computed(() => {
  const status = error.statusCode;

  if (status === 404) {
    return t("common.errorPage.notFound");
  }

  if (status !== undefined && status >= 500) {
    return t("common.errorPage.serverError");
  }

  return error.statusMessage;
});
</script>

<template>
  <main
    class="flex min-h-[calc(100vh-var(--spacing-header))] flex-col items-center justify-center px-4 text-center"
  >
    <p class="text-base font-medium text-primary">{{ error.statusCode }}</p>
    <h1 class="mt-2 text-4xl font-medium text-balance text-highlighted sm:text-5xl">
      {{ heading }}
    </h1>
    <SButton
      class="mt-8"
      :label="t('common.errorPage.backHome')"
      @click="clearError({ redirect: localePath('/') })"
    />
  </main>
</template>
