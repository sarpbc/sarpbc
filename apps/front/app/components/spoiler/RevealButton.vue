<script setup lang="ts">
import type { SpoilerRevealTarget } from "@sarpbc/utils";

const { targets, label } = defineProps<{
  targets: readonly SpoilerRevealTarget[];
  label: string;
}>();

const { reveal } = useSpoilerFree();

function revealAll() {
  for (const target of targets) {
    reveal(target);
  }
}
</script>

<template>
  <UButton
    icon="i-fluent-eye-24-regular"
    color="neutral"
    variant="outline"
    :label="label"
    data-spoiler-reveal
    @click="revealAll"
  />
</template>
