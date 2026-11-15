<script lang="ts" setup>
defineProps<{ message: string }>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-start gap-3 rounded-lg border border-default p-6">
    <p class="text-sm text-muted">{{ message }}</p>
    <SbButton
      icon="i-fluent-arrow-clockwise-24-regular"
      variant="secondary"
      :label="$t('common.retry')"
      @click="$emit('retry')"
    />
  </div>
</template>
