<script setup lang="ts">
const { orientation = "horizontal" } = defineProps<{
  orientation?: "horizontal" | "vertical";
}>();
</script>

<template>
  <div
    class="sb-separator"
    role="separator"
    :aria-orientation="orientation"
    :data-orientation="orientation"
  />
</template>

<style scoped>
/* Mirrors Nuxt UI's separator theme (neutral, solid, xs). */
.sb-separator {
  width: 100%;
  border-top: 1px solid var(--sb-border);
}

.sb-separator[data-orientation="vertical"] {
  width: auto;
  height: 100%;
  border-top: 0;
  border-inline-start: 1px solid var(--sb-border);
}
</style>
