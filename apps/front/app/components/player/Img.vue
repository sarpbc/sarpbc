<script lang="ts" setup>
interface Props {
  playerName: string;
  img?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const boxClasses = {
  sm: "h-12 w-16 shrink-0",
  md: "h-24 w-36 shrink-0",
  lg: "aspect-3/2 w-full min-w-0",
  xl: "h-36 w-48 shrink-0 sm:h-auto sm:min-h-0 sm:w-56 md:w-64 sm:self-stretch",
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
  lg: "(max-width: 639px) 30vw, 192px",
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
  <div :class="[boxClasses[size], 'flex items-center justify-center overflow-hidden']">
    <NuxtImg
      v-if="img"
      :src="img"
      :alt="playerName"
      :width="dim.width"
      :height="dim.height"
      :sizes="sizesAttr[size]"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      :class="[fallbackRadiusClasses[size], 'h-full w-full object-cover']"
    />
    <div
      v-else
      :class="[
        boxClasses[size],
        fallbackRadiusClasses[size],
        'flex items-center justify-center bg-elevated',
      ]"
    >
      <UIcon name="i-fluent-image-24-regular" :class="[iconClasses[size], 'text-muted']" />
    </div>
  </div>
</template>
