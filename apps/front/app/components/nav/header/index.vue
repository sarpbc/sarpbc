<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui";

const { t } = useI18n();

const localePath = useLocalePath();
const route = useRoute();

const menuOpen = ref(false);

const matchesPath = computed(() => localePath("/matches"));

function isMatchesListRoute(): boolean {
  const current = route.path.replace(/\/$/, "");
  const target = matchesPath.value.replace(/\/$/, "");
  return current === target;
}

const isResultsActive = computed(() => isMatchesListRoute() && route.query.tab === "past");

const isMatchesActive = computed(() => isMatchesListRoute() && route.query.tab !== "past");

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function handleMobileMenuClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;

  if (target?.closest("a")) {
    closeMenu();
  }
}

watch(
  () => route.fullPath,
  () => {
    closeMenu();
  },
);

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: t("general.matches"),
    to: matchesPath.value,
    active: isMatchesActive.value,
  },
  {
    label: t("general.results"),
    to: { path: matchesPath.value, query: { tab: "past" } },
    active: isResultsActive.value,
  },
  {
    label: t("general.tournaments"),
    to: localePath("/tournaments"),
  },
  {
    label: t("general.games"),
    children: [
      {
        label: t("page.game.airriddle.title"),
        to: localePath("/game/airriddle"),
      },
      {
        label: t("page.game.pickems.title"),
        to: localePath("/game/pickems"),
      },
    ],
  },
]);

const menuToggleLabel = computed(() =>
  menuOpen.value ? t("components.header.closeMenu") : t("components.header.openMenu"),
);
</script>

<template>
  <header
    class="w-full flex flex-col justify-start fixed top-0 z-50 bg-default overflow-hidden lg:overflow-visible border-b border-default"
  >
    <nav
      class="w-full max-w-7xl px-2 lg:px-0 h-header flex flex-row items-center justify-between mx-auto"
    >
      <div class="h-full flex flex-row items-center">
        <ULink
          :to="$localePath('/')"
          class="flex flex-row flex-1 items-center"
          :aria-label="$t('components.header.home')"
        >
          <img
            src="/sarpbc.svg"
            alt="sarpbc.org logo"
            width="48"
            height="48"
            fetchpriority="high"
            decoding="async"
            class="size-12 bg-transparent"
          />
        </ULink>
        <UNavigationMenu
          :items="items"
          color="neutral"
          variant="link"
          orientation="horizontal"
          class="hidden md:flex"
        />
      </div>
      <div class="h-full flex-row flex-1 justify-end items-center gap-4 hidden md:flex">
        <NavHeaderSearch />
        <NavHeaderUser />
      </div>
      <UButton
        :icon="!menuOpen ? 'i-fluent-text-align-justify-24-regular' : 'i-fluent-dismiss-24-regular'"
        color="neutral"
        variant="ghost"
        class="md:hidden flex items-center justify-center size-10 ml-2"
        :aria-label="menuToggleLabel"
        :aria-expanded="menuOpen"
        @click="toggleMenu()"
      />
    </nav>
    <div
      v-if="menuOpen"
      class="fixed inset-x-0 top-header bottom-0 bg-default md:hidden overflow-y-auto"
      @click="handleMobileMenuClick"
    >
      <div
        class="w-full max-w-7xl px-9 mx-auto flex flex-col items-center justify-start gap-1.5 pt-6 pb-12 min-h-full"
      >
        <UNavigationMenu
          :items="items"
          color="neutral"
          variant="link"
          orientation="vertical"
          class="w-full [&_a]:text-lg [&_a]:font-medium [&_a]:py-3 [&_button]:text-lg [&_button]:font-medium [&_button]:py-3"
        />
        <div class="w-full flex flex-row justify-start pl-2.5 pt-2">
          <NavHeaderUser />
        </div>
      </div>
    </div>
  </header>
</template>
