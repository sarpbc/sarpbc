<script setup lang="ts">
import type { NuxtError } from "#app";

const { error } = defineProps<{ error: NuxtError }>();

const { t } = useI18n();

const heading = computed(() => {
  const status = error.statusCode;

  if (status === 404) return t("common.errorPage.notFound");

  if (status !== undefined && status >= 500) return t("common.errorPage.serverError");

  return error.statusMessage;
});
</script>

<template>
  <UError :error="error">
    <template v-if="heading" #statusMessage>{{ heading }}</template>
  </UError>
</template>
