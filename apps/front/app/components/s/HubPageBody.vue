<script setup lang="ts">
import type { VNode } from "vue";

type CaptionAlign = "start" | "center";

const { captionAlign = "center", class: className } = defineProps<{
  captionAlign?: CaptionAlign;
  class?: string;
}>();

defineSlots<{
  caption?(): VNode[];
  default(): VNode[];
}>();
</script>

<template>
  <SRail caption="lead" :caption-align="captionAlign" :class="className">
    <template v-if="$slots.caption" #caption>
      <slot name="caption" />
    </template>
    <div class="w-full flex flex-col gap-4">
      <slot />
    </div>
  </SRail>
</template>
