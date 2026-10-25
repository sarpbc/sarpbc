<script setup lang="ts">
defineProps<{
  title: string;
  status: "idle" | "pending" | "success" | "error";
  empty?: boolean;
  emptyLabel?: string;
  errorLabel: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <section class="flex min-w-0 flex-col gap-3">
    <h2 class="text-sm font-semibold">{{ title }}</h2>

    <div v-if="status === 'pending' || status === 'idle'" class="flex flex-col gap-2">
      <div v-for="n in 3" :key="n" class="h-10 w-full animate-pulse rounded-sm bg-elevated" />
    </div>

    <div
      v-else-if="status === 'error'"
      class="flex flex-col items-start gap-3 rounded-lg border border-default p-4"
    >
      <p class="text-sm text-muted">{{ errorLabel }}</p>
      <UButton
        icon="i-fluent-arrow-clockwise-24-regular"
        variant="soft"
        :label="$t('page.home.retry')"
        @click="$emit('retry')"
      />
    </div>

    <p v-else-if="empty" class="rounded-lg border border-default p-4 text-sm text-muted">
      {{ emptyLabel }}
    </p>

    <slot v-else />
  </section>
</template>
