<script setup lang="ts">
import { icons } from "@iconify-json/lucide";
import { Icon, addCollection } from "@iconify/vue";

/* The apps resolve `i-lucide-*` names through Nuxt Icon; the catalog bundles the set so it renders offline. */
addCollection(icons);

const { name } = defineProps<{ name: string }>();
</script>

<template>
  <Icon :icon="name.replace(/^i-lucide-/u, 'lucide:')" aria-hidden="true" />
</template>
