<script setup lang="ts">
const { as = "div" } = defineProps<{
  as?: string;
}>();
</script>

<template>
  <component :is="as" class="frame relative flex">
    <div class="flex h-full min-h-0 w-full flex-1 items-center">
      <slot />
    </div>
    <span class="cross-ticks" aria-hidden="true" />
  </component>
</template>
