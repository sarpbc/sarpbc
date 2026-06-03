<template>
  <div class="w-full flex flex-col h-svh h-max-svh">
    <UButton
      icon="fluent:dismiss-24-regular"
      to="/"
      variant="ghost"
      color="neutral"
      class="absolute top-4 left-4"
      size="lg"
    />
    <slot />
  </div>
</template>
