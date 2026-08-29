<script lang="ts" setup>
import { resolveThemedLogoUrl } from "@sarpbc/utils";

interface Props {
  teamName: string;
  imageUrl?: string;
  darkModeImageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const boxClasses = {
  xs: "size-4",
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

const dimensions = {
  xs: { width: 16, height: 16 },
  sm: { width: 40, height: 40 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
};

const sizesAttr = {
  xs: "16px",
  sm: "40px",
  md: "64px",
  lg: "96px",
};

const iconClasses = {
  xs: "size-2.5",
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
};

const fallbackRadiusClasses = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
};

const {
  teamName,
  imageUrl,
  darkModeImageUrl,
  size = "md",
  priority = false,
} = defineProps<Props>();

const colorMode = useColorMode();
const src = computed(() => resolveThemedLogoUrl(imageUrl, darkModeImageUrl, colorMode.value));
const dim = computed(() => dimensions[size]);
</script>

<template>
  <div :class="[boxClasses[size], 'flex shrink-0 items-center justify-center']">
    <NuxtImg
      v-if="src"
      :src="src"
      :alt="`${teamName} logo`"
      :width="dim.width"
      :height="dim.height"
      :sizes="sizesAttr[size]"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      :class="[fallbackRadiusClasses[size], 'max-h-full max-w-full object-contain']"
    />
    <div
      v-else
      :class="[
        boxClasses[size],
        fallbackRadiusClasses[size],
        'flex items-center justify-center bg-elevated outline -outline-offset-1 outline-neutral-50/10',
      ]"
    >
      <UIcon name="i-fluent-people-team-24-regular" :class="[iconClasses[size], 'text-muted']" />
    </div>
  </div>
</template>
