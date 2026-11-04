<script lang="ts" setup>
import { resolveThemedLogoUrl, type ThemedLogo } from "@sarpbc/utils";

interface Props {
  /** Left out while the match slot has no team yet: shows a generic icon instead of an initial. */
  teamName?: string;
  logo?: ThemedLogo | null;
  size?: "xs" | "list" | "sm" | "md" | "lg" | "xl";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const boxClasses = {
  xs: "size-4",
  list: "size-7",
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
  xl: "size-24 sm:h-auto sm:min-h-0 sm:w-32 md:w-40 sm:self-stretch",
};

const dimensions = {
  xs: { width: 16, height: 16 },
  list: { width: 28, height: 28 },
  sm: { width: 40, height: 40 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
  xl: { width: 160, height: 160 },
};

const sizesAttr = {
  xs: "16px",
  list: "28px",
  sm: "40px",
  md: "64px",
  lg: "96px",
  xl: "(max-width: 640px) 96px, (max-width: 768px) 128px, 160px",
};

const iconClasses = {
  xs: "size-2.5",
  list: "size-4",
  sm: "size-5",
  md: "size-8",
  lg: "size-10",
  xl: "size-12",
};

const initialClasses = {
  xs: "text-[10px]",
  list: "text-sm",
  sm: "text-lg",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-5xl",
};

const fallbackRadiusClasses = {
  xs: "rounded-xs",
  list: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-lg",
};

const { teamName, logo, size = "md", priority = false } = defineProps<Props>();

// The server cannot know the theme stored in the browser, and hydration does not patch src: let CSS pick the variant.
const variants = computed(() => {
  const light = resolveThemedLogoUrl(logo, "light");
  const dark = resolveThemedLogoUrl(logo, "dark");
  return light === dark
    ? [{ src: light, imgClass: "", fallbackClass: "flex" }]
    : [
        { src: light, imgClass: "dark:hidden", fallbackClass: "flex dark:hidden" },
        { src: dark, imgClass: "hidden dark:block", fallbackClass: "hidden dark:flex" },
      ];
});
const initial = computed(() =>
  teamName
    ? shortTeamName(teamName)
        .match(/[\p{L}\p{N}]/u)?.[0]
        ?.toUpperCase()
    : undefined,
);
const dim = computed(() => dimensions[size]);
const failedSrcs = ref(new Set<string>());
</script>

<template>
  <div :class="[boxClasses[size], 'flex shrink-0 items-center justify-center']">
    <template v-for="{ src, imgClass, fallbackClass } in variants" :key="fallbackClass">
      <NuxtImg
        v-if="src && !failedSrcs.has(src)"
        :src="src"
        :alt="`${teamName} logo`"
        :width="dim.width"
        :height="dim.height"
        :sizes="sizesAttr[size]"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : undefined"
        :class="[fallbackRadiusClasses[size], imgClass, 'max-h-full max-w-full object-contain']"
        @error="failedSrcs.add(src)"
      />
      <div
        v-else
        :class="[
          boxClasses[size],
          fallbackRadiusClasses[size],
          fallbackClass,
          'items-center justify-center bg-muted',
        ]"
      >
        <span
          v-if="initial"
          role="img"
          :aria-label="`${teamName} logo`"
          :class="[initialClasses[size], 'font-medium leading-none text-muted']"
        >
          {{ initial }}
        </span>
        <UIcon
          v-else
          name="i-fluent-people-team-24-regular"
          :class="[iconClasses[size], 'text-muted']"
        />
      </div>
    </template>
  </div>
</template>
