<script setup lang="ts">
defineSlots<{
  title(): unknown;
  meta?(): unknown;
}>();
</script>

<template>
  <SCrossCard class="h-row-header">
    <div class="w-full flex flex-col justify-center items-center gap-0.5 px-4">
      <h1 class="text-xl font-semibold text-center text-balance">
        <slot name="title" />
      </h1>
      <div v-if="$slots.meta" class="flex items-center justify-center gap-2 text-sm text-muted">
        <slot name="meta" />
      </div>
    </div>
  </SCrossCard>
</template>
