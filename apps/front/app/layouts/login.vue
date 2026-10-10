<script lang="ts" setup>
const localePath = useLocalePath();
</script>

<template>
  <div class="relative w-full flex flex-col h-svh">
    <UButton
      icon="i-fluent-dismiss-24-regular"
      :to="localePath('/')"
      variant="ghost"
      color="neutral"
      class="absolute top-4 left-4"
      size="lg"
      :aria-label="$t('common.close')"
    />
    <slot />
  </div>
</template>
