<script setup lang="ts">
const route = useRoute();
const getRouteBaseName = useRouteBaseName();
const isHome = computed(() => getRouteBaseName(route) === "index");
</script>

<template>
  <main class="w-full min-h-svh flex flex-col items-center">
    <NavHeader />
    <div class="hub-soft w-full flex flex-1 flex-col items-center pt-header pb-6 md:pb-16">
      <div class="w-full max-w-7xl flex flex-1 flex-col py-4 px-2 xl:px-0">
        <div class="flex flex-1 flex-col gap-2 md:grid md:grid-cols-12 md:gap-6 lg:gap-8">
          <div class="hidden md:flex md:col-span-3 lg:col-span-3">
            <SHubColumn variant="main">
              <LazyMatchLateralBar hydrate-on-visible />
            </SHubColumn>
          </div>

          <SHubColumn variant="main" class="md:col-span-6 hub-column-rules">
            <slot />
          </SHubColumn>

          <SHubColumn variant="rail" class="hidden md:col-span-3 md:flex">
            <ClientOnly>
              <LazyForumPreview hydrate-on-idle />
              <LazyTransferRail v-if="isHome" hydrate-on-idle />
            </ClientOnly>
          </SHubColumn>
        </div>
      </div>
    </div>
    <LazyNavFooter hydrate-on-visible class="mt-auto" />
    <LazyLandingCookiePopup hydrate-on-idle />
  </main>
</template>
