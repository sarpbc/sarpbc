<script lang="ts" setup>
interface Props {
  playerName: string;
  img?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const boxClasses = {
  sm: "h-12 w-16",
  md: "h-24 w-36",
  lg: "h-32 w-48",
  xl: "h-48 w-64",
};

const iconClasses = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
  xl: "size-12",
};

const fallbackRadiusClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-md",
  xl: "rounded-lg",
};

const { playerName, img = undefined, size = "md" } = defineProps<Props>();
</script>

<template>
  <div :class="[boxClasses[size], 'flex shrink-0 items-center justify-center']">
    <img
      v-if="img"
      :src="img"
      :alt="playerName"
      :class="[
        fallbackRadiusClasses[size],
        'max-h-full max-w-full object-contain ring-1 ring-black/10 dark:ring-white/10',
      ]"
    />
    <div
      v-else
      :class="[
        boxClasses[size],
        fallbackRadiusClasses[size],
        'flex items-center justify-center bg-elevated ring-1 ring-black/10 dark:ring-white/10',
      ]"
    >
      <UIcon name="i-fluent-image-24-regular" :class="[iconClasses[size], 'text-muted']" />
    </div>
  </div>
</template>
