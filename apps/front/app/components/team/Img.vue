<script lang="ts" setup>
import { resolveThemedLogoUrl } from "@sarpbc/utils";
import type { ThemedLogo } from "@sarpbc/utils";

interface Props {
  /** Left out while the match slot has no team yet: shows a generic icon instead of an initial. */
  teamName?: string | null;
  logo?: ThemedLogo | null;
  size?: "xs" | "list" | "sm" | "md" | "lg" | "xl";
  /** Use for above-the-fold / LCP images */
  priority?: boolean;
}

const SIZES = {
  lg: {
    box: "size-24",
    height: 96,
    icon: "size-10",
    initial: "text-5xl",
    radius: "rounded-lg",
    sizes: "96px",
    width: 96,
  },
  list: {
    box: "size-7",
    height: 28,
    icon: "size-4",
    initial: "text-sm",
    radius: "rounded-xs",
    sizes: "28px",
    width: 28,
  },
  md: {
    box: "size-16",
    height: 64,
    icon: "size-8",
    initial: "text-3xl",
    radius: "rounded-md",
    sizes: "64px",
    width: 64,
  },
  sm: {
    box: "size-10",
    height: 40,
    icon: "size-5",
    initial: "text-lg",
    radius: "rounded-sm",
    sizes: "40px",
    width: 40,
  },
  xl: {
    box: "size-24 sm:h-auto sm:min-h-0 sm:w-32 md:w-40 sm:self-stretch",
    height: 160,
    icon: "size-12",
    initial: "text-5xl",
    radius: "rounded-lg",
    sizes: "(max-width: 640px) 96px, (max-width: 768px) 128px, 160px",
    width: 160,
  },
  xs: {
    box: "size-4",
    height: 16,
    icon: "size-2.5",
    initial: "text-[10px]",
    radius: "rounded-xs",
    sizes: "16px",
    width: 16,
  },
};

const { teamName = null, logo = null, size = "md", priority = false } = defineProps<Props>();

// The server cannot know the theme stored in the browser, and hydration does not patch src: let CSS pick the variant.
const variants = computed(() => {
  const light = resolveThemedLogoUrl(logo, "light");
  const dark = resolveThemedLogoUrl(logo, "dark");

  return light === dark
    ? [{ fallbackClass: "flex", imgClass: "", src: light }]
    : [
        { fallbackClass: "flex dark:hidden", imgClass: "dark:hidden", src: light },
        { fallbackClass: "hidden dark:flex", imgClass: "hidden dark:block", src: dark },
      ];
});

const initial = computed(() =>
  teamName
    ? shortTeamName(teamName)
        .match(/[\p{L}\p{N}]/u)?.[0]
        ?.toUpperCase()
    : undefined,
);

const spec = computed(() => SIZES[size]);
const failedSrcs = ref(new Set<string>());
</script>

<template>
  <div :class="[spec.box, 'flex shrink-0 items-center justify-center']">
    <template v-for="{ src, imgClass, fallbackClass } in variants" :key="fallbackClass">
      <NuxtImg
        v-if="src && !failedSrcs.has(src)"
        :src="src"
        :alt="`${teamName} logo`"
        :width="spec.width"
        :height="spec.height"
        :sizes="spec.sizes"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : undefined"
        :class="[spec.radius, imgClass, 'max-h-full max-w-full object-contain']"
        @error="failedSrcs.add(src)"
      />
      <div
        v-else
        :class="[spec.box, spec.radius, fallbackClass, 'items-center justify-center bg-muted']"
      >
        <span
          v-if="initial"
          role="img"
          :aria-label="`${teamName} logo`"
          :class="[spec.initial, 'font-medium leading-none text-muted']"
        >
          {{ initial }}
        </span>
        <Icon v-else name="i-fluent-people-team-24-regular" :class="[spec.icon, 'text-muted']" />
      </div>
    </template>
  </div>
</template>
