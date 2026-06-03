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
  <UIcon
    v-if="nationality"
    :name="`flag:${nationality.toLowerCase()}-4x3`"
    :class="sizeClasses[size || 'md']"
    class="inline-block"
  />
</template>
