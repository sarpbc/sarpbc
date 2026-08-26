<script lang="ts" setup>
const { isLast = false } = defineProps<{
  /** Last sibling draws an L. Earlier siblings keep a spine through the rest of the row. */
  isLast?: boolean;
}>();
</script>

<template>
  <div class="flex w-6 shrink-0 flex-col self-stretch" aria-hidden="true">
    <div class="relative h-row-compact w-full shrink-0">
      <div
        class="absolute top-0 left-0 h-1/2 w-full border-b border-default"
        :class="{ 'border-l': isLast }"
      />
      <div v-if="!isLast" class="absolute inset-y-0 left-0 border-l border-default" />
    </div>
    <div v-if="!isLast" class="min-h-0 flex-1 border-l border-default" />
  </div>
</template>
