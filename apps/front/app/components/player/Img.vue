<script lang="ts" setup>
interface Props {
  playerName: string;
  img?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-h-12 max-w-16",
  md: "max-h-24 max-w-36",
  lg: "max-h-32 max-w-48",
  xl: "max-h-48 max-w-64",
};

const placeholderSizeClasses = {
  sm: "h-12 w-16",
  md: "h-24 w-36",
  lg: "h-32 w-48",
  xl: "h-48 w-64",
};

const { playerName, img = undefined, size = "md" } = defineProps<Props>();
</script>

<template>
  <div class="w-fit h-fit">
    <img v-if="img" :src="img" :alt="playerName" :class="[sizeClasses[size], 'object-contain ']" />
    <div
      v-else
      :class="[placeholderSizeClasses[size], 'bg-muted/50 flex items-center justify-center ']"
    >
      <UIcon name="i-fluent-image-24-regular" class="text-muted size-8" />
    </div>
  </div>
</template>
