<script setup lang="ts">
import type { VNode } from "vue";

const { node } = defineProps<{ node: VNode }>();
</script>

<template>
  <component :is="node" />
</template>
