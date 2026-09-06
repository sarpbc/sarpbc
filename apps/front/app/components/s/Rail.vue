<script setup lang="ts">
type RailCaption = "lead" | "section" | "none";
type CaptionAlign = "start" | "center";

const {
  title,
  caption = "section",
  captionAlign = "start",
  class: className,
} = defineProps<{
  title?: string;
  /**
   * `lead` — first rail in a hub column (72px); aligns with `SHubPageHeader` + gap.
   * `section` — stacked rails / mid-page blocks (44px / `h-row`).
   * `none` — no caption band; use after a `h-row-header` + `gap-4` page header.
   */
  caption?: RailCaption;
  captionAlign?: CaptionAlign;
  class?: string;
}>();

const captionHeightClass = computed(() => {
  switch (caption) {
    case "lead":
      return "h-rail-caption";
    case "section":
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
        'flex flex-col-reverse pb-1 text-sm font-medium text-toned',
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
