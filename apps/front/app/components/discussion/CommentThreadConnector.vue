<script lang="ts" setup>
const { isLast = false } = defineProps<{
  /** Last sibling draws an L. Earlier siblings keep a spine through the rest of the row. */
  isLast?: boolean;
}>();
</script>

<template>
  <!-- Elbow height h-12 (48px) = nested mt-4 + comment header h-8. -->
  <div class="relative w-4 shrink-0 self-stretch" aria-hidden="true">
    <div class="h-12 w-4 border-b border-default" :class="{ 'border-l': isLast }" />
    <div v-if="!isLast" class="absolute inset-y-0 left-0 border-l border-default" />
  </div>
</template>
