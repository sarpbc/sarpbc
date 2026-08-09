<script lang="ts" setup>
const { count } = defineProps<{
  count: number;
}>();

const { t } = useI18n();

const showCount = computed(() => count > 0);
</script>

<template>
  <span
    v-if="showCount"
    class="inline-flex items-center gap-1 text-xs text-muted tabular-nums shrink-0"
    :aria-label="t('components.discussion.commentCountAria', { count })"
  >
    <UIcon name="i-fluent-chat-24-regular" class="size-3.5" aria-hidden="true" />
    {{ count }}
  </span>
</template>
