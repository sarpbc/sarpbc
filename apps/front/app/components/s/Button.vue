<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});
</script>

<template>
  <UButton v-bind="delegatedAttrs">
    <slot />
  </UButton>
</template>
