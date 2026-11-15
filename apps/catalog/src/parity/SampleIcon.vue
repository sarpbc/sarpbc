<script setup lang="ts">
const { name } = defineProps<{ name: string }>();
</script>

<template>
  <svg
    :data-icon="name"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" stroke-linecap="round" />
  </svg>
</template>
