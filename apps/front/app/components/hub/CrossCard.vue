<script setup lang="ts">
const { as = "div" } = defineProps<{
  as?: string;
}>();
</script>

<template>
  <component :is="as" class="flex">
    <div class="flex h-full min-h-0 w-full flex-1 items-center">
      <slot />
    </div>
  </component>
</template>
