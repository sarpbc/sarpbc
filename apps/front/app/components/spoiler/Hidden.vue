<script setup lang="ts">
const { label } = defineProps<{ label?: string }>();

const { t } = useI18n();
</script>

<template>
  <span class="inline-flex items-center justify-center text-muted" data-spoiler-hidden>
    <UIcon name="i-fluent-eye-off-24-regular" class="size-4" aria-hidden="true" />
    <span class="sr-only">{{ label ?? t("components.spoiler.hidden") }}</span>
  </span>
</template>
