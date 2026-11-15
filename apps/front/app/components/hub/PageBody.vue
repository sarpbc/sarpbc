<script setup lang="ts">
import type { VNode } from "vue";

type CaptionAlign = "start" | "center";

const { captionAlign = "center", class: className = null } = defineProps<{
  captionAlign?: CaptionAlign;
  class?: string | null;
}>();

defineSlots<{
  caption?: () => VNode[];
  default: () => VNode[];
}>();
</script>

<template>
  <HubRail caption="lead" :caption-align="captionAlign" :class="className">
    <template v-if="$slots.caption" #caption>
      <slot name="caption" />
    </template>
    <div class="w-full flex flex-col gap-4">
      <slot />
    </div>
  </HubRail>
</template>
