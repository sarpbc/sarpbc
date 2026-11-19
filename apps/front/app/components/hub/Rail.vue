<script setup lang="ts">
type RailCaption = "lead" | "section" | "none";

type CaptionAlign = "start" | "center";

const {
  title = null,
  caption = "section",
  captionAlign = "start",
  class: className = null,
} = defineProps<{
  title?: string | null;
  caption?: RailCaption;
  captionAlign?: CaptionAlign;
  class?: string | null;
}>();

const slots = useSlots();

const hideEmptyLeadOnMobile = computed(
  () => caption === "lead" && !title && !slots.caption && !slots.title,
);

const captionHeightClass = computed(() => {
  switch (caption) {
    case "lead": {
      return "h-row md:h-rail-caption";
    }

    case "section": {
      return "h-row";
    }

    case "none": {
      return "";
    }

    default: {
      const _exhaustive: never = caption;

      return _exhaustive;
    }
  }
});

const captionAlignClass = computed(() => {
  switch (captionAlign) {
    case "start": {
      return "items-start pl-2 text-start";
    }

    case "center": {
      return "items-center text-center";
    }

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
        'flex-col-reverse pb-2 text-sm font-medium text-highlighted',
        'rail-caption',
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
