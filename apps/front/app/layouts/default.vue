<template>
  <main class="w-full min-h-svh flex flex-col items-center">
    <NavHeader />
    <div class="w-full flex flex-col items-center py-16">
      <div class="w-full md:max-w-7xl py-6 md:py-4 px-2 md:px-0">
        <div class="flex flex-col gap-2 md:grid md:grid-cols-12 md:gap-4">
          <!-- Match Lateral Bar (desktop only; hydrate when visible) -->
          <div class="hidden md:flex md:col-span-3 lg:col-span-2">
            <LazyMatchLateralBar hydrate-on-visible />
          </div>

          <!-- Main Slot -->
          <div class="flex w-full md:col-span-6 lg:col-span-8">
            <slot />
          </div>

          <!-- Right sidebar -->
          <div class="flex flex-col gap-4 md:col-span-3 lg:col-span-2 mt-4 md:mt-0">
            <LazyForumPreview hydrate-on-idle />
            <div class="hidden md:flex">
              <LazyGameSidebarPromo hydrate-on-idle />
            </div>
          </div>
        </div>
      </div>
    </div>
    <NavFooter class="mt-auto" />
    <LazyLandingCookiePopup hydrate-on-idle />
  </main>
</template>
