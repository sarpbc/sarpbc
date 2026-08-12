<script setup lang="ts">
type HubColumnVariant = "rail" | "main";

const { variant = "main", class: className } = defineProps<{
  variant?: HubColumnVariant;
  class?: string;
}>();

const variantClass = computed(() => {
  switch (variant) {
    case "rail":
      return "mt-4 md:mt-0";
    case "main":
      return "";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div :class="['flex w-full flex-col', variantClass, className]">
    <slot />
  </div>
</template>
