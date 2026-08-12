<script lang="ts" setup>
const { flushBottom = false } = defineProps<{
  /** Omit bottom border — last list row’s `border-b` closes the box. */
  flushBottom?: boolean;
}>();
</script>

<template>
  <div class="box-border border-default" :class="flushBottom ? 'border-x border-t' : 'border'">
    <slot />
  </div>
</template>
