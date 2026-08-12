<script lang="ts" setup>
const localePath = useLocalePath();
</script>

<template>
  <main class="w-full min-h-svh flex flex-col bg-default">
    <header class="w-full shrink-0 border-b border-default">
      <div class="w-full max-w-7xl mx-auto px-2 lg:px-0 h-12 flex flex-row items-center">
        <ULink
          :to="localePath('/')"
          class="flex items-center"
          :aria-label="$t('components.header.home')"
        >
          <img
            src="/sarpbc.svg"
            alt="sarpbc.org logo"
            width="40"
            height="40"
            decoding="async"
            class="size-10 bg-transparent"
          />
        </ULink>
      </div>
    </header>
    <div class="w-full flex-1 flex flex-col items-center px-2 md:px-0 py-6">
      <div class="w-full max-w-7xl">
        <slot />
      </div>
    </div>
    <LazyLandingCookiePopup hydrate-on-idle />
  </main>
</template>
