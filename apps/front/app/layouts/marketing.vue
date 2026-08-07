<template>
  <main class="w-full min-h-svh flex flex-col items-center">
    <NavHeader />
    <div class="w-full flex flex-col items-center pt-header pb-16 md:pt-20 md:pb-20">
      <div class="w-full max-w-7xl px-8 md:px-6 py-6 md:py-8">
        <slot />
      </div>
    </div>
    <NavFooter class="mt-auto" />
    <LazyLandingCookiePopup hydrate-on-idle />
  </main>
</template>
