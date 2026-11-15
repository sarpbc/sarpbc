<script setup lang="ts">
import type { SpoilerRevealTarget } from "@sarpbc/utils";

const { targets, label } = defineProps<{
  targets: readonly SpoilerRevealTarget[];
  label: string;
}>();

const { reveal } = useSpoilerFree();

const revealAll = () => {
  for (const target of targets) {
    reveal(target);
  }
};
</script>

<template>
  <SbButton
    icon="i-fluent-eye-24-regular"
    variant="secondary"
    :label="label"
    data-spoiler-reveal
    @click="revealAll"
  />
</template>
