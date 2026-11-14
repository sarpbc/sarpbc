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

const SIZES = {
  xs: {
    box: "size-4",
    width: 16,
    height: 16,
    sizes: "16px",
    icon: "size-2.5",
    initial: "text-[10px]",
    radius: "rounded-xs",
  },
  list: {
    box: "size-7",
    width: 28,
    height: 28,
    sizes: "28px",
    icon: "size-4",
    initial: "text-sm",
    radius: "rounded-xs",
  },
  sm: {
    box: "size-10",
    width: 40,
    height: 40,
    sizes: "40px",
    icon: "size-5",
    initial: "text-lg",
    radius: "rounded-sm",
  },
  md: {
    box: "size-16",
    width: 64,
    height: 64,
    sizes: "64px",
    icon: "size-8",
    initial: "text-3xl",
    radius: "rounded-md",
  },
  lg: {
    box: "size-24",
    width: 96,
    height: 96,
    sizes: "96px",
    icon: "size-10",
    initial: "text-5xl",
    radius: "rounded-lg",
  },
  xl: {
    box: "size-24 sm:h-auto sm:min-h-0 sm:w-32 md:w-40 sm:self-stretch",
    width: 160,
    height: 160,
    sizes: "(max-width: 640px) 96px, (max-width: 768px) 128px, 160px",
    icon: "size-12",
    initial: "text-5xl",
    radius: "rounded-lg",
  },
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
        <UIcon v-else name="i-fluent-people-team-24-regular" :class="[spec.icon, 'text-muted']" />
      </div>
    </template>
  </div>
</template>
