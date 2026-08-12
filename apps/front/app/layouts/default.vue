<template>
  <main class="w-full min-h-svh flex flex-col items-center">
    <NavHeader />
    <div class="w-full flex flex-col items-center pt-header pb-6 md:pb-16">
      <div class="w-full md:max-w-7xl py-6 md:py-4 px-2 md:px-0">
        <div class="flex flex-col gap-2 md:grid md:grid-cols-12 md:gap-4">
          <div class="hidden md:flex md:col-span-3 lg:col-span-2">
            <SHubColumn variant="main">
              <MatchLateralBar />
            </SHubColumn>
          </div>

          <SHubColumn variant="main" class="md:col-span-6 lg:col-span-8">
            <slot />
          </SHubColumn>

          <SHubColumn variant="rail" class="hidden md:col-span-3 md:flex lg:col-span-2">
            <ClientOnly>
              <LazyForumPreview hydrate-on-idle />
            </ClientOnly>
          </SHubColumn>
        </div>
      </div>
    </div>
    <NavFooter class="mt-auto" />
    <LandingCookiePopup />
  </main>
</template>
