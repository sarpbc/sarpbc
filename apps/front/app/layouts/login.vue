<script lang="ts" setup>
const localePath = useLocalePath();
</script>

<template>
  <div class="relative w-full flex flex-col h-svh">
    <SbButton
      icon="i-fluent-dismiss-24-regular"
      :to="localePath('/')"
      variant="tertiary"
      class="absolute top-4 left-4"
      :aria-label="$t('common.close')"
    />
    <slot />
  </div>
</template>
