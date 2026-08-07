<script lang="ts" setup>
interface Props {
  playerName: string;
  img?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const boxClasses = {
  sm: "h-12 w-16",
  md: "h-24 w-36",
  lg: "h-28 w-40 sm:h-32 sm:w-48",
  // Shrink on narrow viewports so profile cards stay within the screen.
  xl: "h-36 w-48 sm:h-44 sm:w-56 md:h-48 md:w-64",
};

const dimensions = {
  sm: { width: 64, height: 48 },
  md: { width: 144, height: 96 },
  lg: { width: 192, height: 128 },
  xl: { width: 256, height: 192 },
};

const sizesAttr = {
  sm: "64px",
  md: "144px",
  lg: "(max-width: 640px) 160px, 192px",
  xl: "(max-width: 640px) 192px, (max-width: 768px) 224px, 256px",
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

const { playerName, img = undefined, size = "md", priority = false } = defineProps<Props>();

const dim = computed(() => dimensions[size]);
</script>

<template>
  <div :class="[boxClasses[size], 'flex shrink-0 items-center justify-center']">
    <NuxtImg
      v-if="img"
      :src="img"
      :alt="playerName"
      :width="dim.width"
      :height="dim.height"
      :sizes="sizesAttr[size]"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      :class="[
        fallbackRadiusClasses[size],
        'h-full w-full object-cover ring-1 ring-black/10 dark:ring-white/10',
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
