<script setup lang="ts">
const { to, label } = defineProps<{
  to: string;
  label: string;
}>();
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex justify-start items-center text-muted text-sm border border-default bg-elevated/50 px-2 py-1"
  >
    {{ label }}
  </NuxtLink>
</template>
