<script setup lang="ts">
type CaptionAlign = "start" | "center";

const { captionAlign = "center", class: className } = defineProps<{
  captionAlign?: CaptionAlign;
  class?: string;
}>();

defineSlots<{
  caption?(): unknown;
  default(): unknown;
}>();
</script>

<template>
  <SRail caption="lead" :caption-align="captionAlign" :class="className">
    <template #caption>
      <slot name="caption" />
    </template>
    <div class="w-full flex flex-col gap-4">
      <slot />
    </div>
  </SRail>
</template>
