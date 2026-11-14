<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <span>
    <span aria-hidden="true" :title="t('components.match.forfeit')">
      {{ t("components.match.forfeitShort") }}
    </span>
    <span class="sr-only">{{ t("components.match.forfeit") }}</span>
  </span>
</template>
