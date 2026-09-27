<script setup lang="ts">
const { message } = defineProps<{
  message: string;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    role="alert"
    class="flex w-full flex-col items-center justify-center gap-3 px-4 py-8 text-center"
  >
    <UIcon name="i-fluent-warning-24-regular" class="text-3xl text-muted" aria-hidden="true" />
    <p class="text-sm text-muted text-pretty">{{ message }}</p>
    <UButton variant="outline" color="neutral" @click="emit('retry')">
      {{ t("common.retry") }}
    </UButton>
  </div>
</template>
