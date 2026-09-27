<script setup lang="ts">
type RailCaption = "lead" | "section" | "plain" | "none";
type CaptionAlign = "start" | "center";

const {
  title,
  caption = "section",
  captionAlign = "start",
  class: className,
} = defineProps<{
  title?: string;
  /**
   * `lead` — first rail in a hub column (72px from `md`); aligns with `SHubPageHeader` + gap.
   * `section` — stacked rails / mid-page blocks (44px / `h-row`).
   * `plain` — 44px band without the hairline, for content that brings its own captions or bordered cards.
   * `none` — no caption band; use after a `h-row-header` + `gap-4` page header.
   */
  caption?: RailCaption;
  captionAlign?: CaptionAlign;
  class?: string;
}>();

const slots = useSlots();

// Single-column mobile has no sidebar to align with: an empty lead band is dead space.
const hideEmptyLeadOnMobile = computed(
  () => caption === "lead" && !title && !slots.caption && !slots.title,
);

const captionHeightClass = computed(() => {
  switch (caption) {
    case "lead":
      return "h-row md:h-rail-caption";
    case "section":
      return "h-row border-b border-default";
    case "plain":
      return "h-row";
    case "none":
      return "";
    default: {
      const _exhaustive: never = caption;
      return _exhaustive;
    }
  }
});

const captionAlignClass = computed(() => {
  switch (captionAlign) {
    case "start":
      return "items-start pl-2 text-start";
    case "center":
      return "items-center text-center";
    default: {
      const _exhaustive: never = captionAlign;
      return _exhaustive;
    }
  }
});
</script>

<template>
  <div :class="['w-full flex flex-col', className]">
    <div
      v-if="caption !== 'none'"
      :class="[
        'flex-col-reverse pb-1 text-sm font-medium text-toned',
        hideEmptyLeadOnMobile ? 'hidden md:flex' : 'flex',
        captionHeightClass,
        captionAlignClass,
      ]"
    >
      <slot name="caption">
        <slot name="title">{{ title }}</slot>
      </slot>
    </div>
    <slot />
  </div>
</template>
