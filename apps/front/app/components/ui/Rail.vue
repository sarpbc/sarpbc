<script setup lang="ts">
const { title, class: className } = defineProps<{
  title?: string;
  class?: string;
}>();
</script>

<template>
  <div :class="['w-full flex flex-col', className]">
    <div class="flex h-rail-caption flex-col-reverse pb-1 pl-2 text-sm font-medium text-toned">
      <slot name="caption">
        <slot name="title">{{ title }}</slot>
      </slot>
    </div>
    <slot />
  </div>
</template>
