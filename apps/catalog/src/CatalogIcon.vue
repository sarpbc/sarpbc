<script setup lang="ts">
import { icons } from "@iconify-json/lucide";
import { Icon, addCollection } from "@iconify/vue";

addCollection(icons);

const { name } = defineProps<{ name: string }>();
</script>

<template>
  <Icon :icon="name.replace(/^i-lucide-/u, 'lucide:')" aria-hidden="true" />
</template>
