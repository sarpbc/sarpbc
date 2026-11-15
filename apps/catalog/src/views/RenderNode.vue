<script setup lang="ts">
import type { VNode } from "vue";

/* A stable component type, so a re-render patches the preview instead of remounting it. */
const { node } = defineProps<{ node: VNode }>();
</script>

<template>
  <component :is="node" />
</template>
