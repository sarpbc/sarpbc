<script lang="ts" setup>
interface Props {
  nationality?: string | null;
  size?: "sm" | "md" | "lg";
}

defineProps<Props>();

const sizeClasses = {
  sm: "w-3 h-2",
  md: "w-4 h-3",
  lg: "w-6 h-4",
};
</script>

<template>
  <img
    v-if="nationality"
    :src="`/flags/${nationality.toLowerCase()}.svg`"
    alt=""
    width="4"
    height="3"
    loading="lazy"
    decoding="async"
    :class="sizeClasses[size || 'md']"
    class="inline-block"
  />
</template>
