<script setup lang="ts">
const { icon, title, hint } = defineProps<{
  icon: string;
  title: string;
  hint?: string;
}>();
</script>

<template>
  <div class="flex w-full flex-col items-center justify-center gap-3 px-4 py-8 text-center">
    <UIcon :name="icon" class="text-3xl text-muted" aria-hidden="true" />
    <p class="text-sm text-muted text-pretty">{{ title }}</p>
    <p v-if="hint" class="text-xs text-muted text-pretty">{{ hint }}</p>
    <div v-if="$slots.default" class="flex flex-wrap items-center justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
