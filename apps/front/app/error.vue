<script setup lang="ts">
defineProps({
  error: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<template>
  <UError :error="error" />
</template>
