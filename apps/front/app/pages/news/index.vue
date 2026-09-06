<script setup lang="ts">
const localePath = useLocalePath();

await navigateTo(localePath("/"), { replace: true, redirectCode: 301 });
</script>

<template>
  <div />
</template>
