<script setup lang="ts">
const localePath = useLocalePath();
const user = useUser();

const navOpen = ref(false);
const userMenuOpen = ref(false);
const pointerInNav = ref(false);
const loggingOut = ref(false);

let closeTimer: ReturnType<typeof setTimeout> | undefined;

const links = useAdminNavLinks();

function openNav() {
  clearTimeout(closeTimer);
  navOpen.value = true;
}

function scheduleCloseNav() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (!pointerInNav.value && !userMenuOpen.value) {
      navOpen.value = false;
    }
  }, 120);
}

function onNavEnter() {
  pointerInNav.value = true;
  openNav();
}

function onNavLeave() {
  pointerInNav.value = false;
  scheduleCloseNav();
}

watch(userMenuOpen, (open) => {
  if (open) {
    openNav();
    return;
  }
  scheduleCloseNav();
});

defineShortcuts({
  escape: {
    usingInput: true,
    handler: () => {
      if (userMenuOpen.value) {
        userMenuOpen.value = false;
        return;
      }
      if (navOpen.value) {
        navOpen.value = false;
      }
    },
  },
});

onBeforeUnmount(() => {
  clearTimeout(closeTimer);
});

async function onLogout() {
  if (loggingOut.value) {
    return;
  }
  loggingOut.value = true;
  try {
    await logout();
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="fixed inset-y-0 left-0 z-40 hidden w-3 lg:block"
    :aria-label="$t('page.nav.openMenu')"
    :aria-expanded="navOpen"
    aria-controls="admin-nav"
    @mouseenter="onNavEnter"
    @focus="onNavEnter"
    @mouseleave="onNavLeave"
    @blur="onNavLeave"
  />

  <aside
    id="admin-nav"
    class="fixed inset-y-0 left-0 z-50 hidden h-svh w-52 flex-col border-r border-default bg-default p-2 transition-transform duration-normal ease-emphasized motion-reduce:transition-none lg:flex"
    :class="navOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'"
    :aria-hidden="!navOpen"
    @mouseenter="onNavEnter"
    @mouseleave="onNavLeave"
  >
    <ULink
      :to="localePath('/')"
      class="mb-2 flex flex-row items-center gap-2 px-2 py-1"
      :aria-label="$t('page.nav.home')"
    >
      <img
        src="/sarpbc.svg"
        :alt="$t('page.home.logoAlt')"
        width="32"
        height="32"
        decoding="async"
        class="size-8 bg-transparent"
      />
      <span class="text-sm font-semibold tracking-tight">{{ $t("page.nav.admin") }}</span>
    </ULink>

    <UNavigationMenu
      orientation="vertical"
      :items="links"
      class="min-h-0 flex-1 overflow-y-auto data-[orientation=vertical]:w-full"
    />

    <UPopover v-if="user" v-model:open="userMenuOpen" :content="{ align: 'start', side: 'top' }">
      <UButton
        color="neutral"
        variant="ghost"
        class="mt-2 w-full justify-start gap-2"
        :aria-label="$t('page.home.signedInAs')"
        aria-haspopup="menu"
        :aria-expanded="userMenuOpen"
      >
        <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.userName" size="xs" />
        <span class="min-w-0 truncate text-sm" translate="no">{{ user.userName }}</span>
      </UButton>
      <template #content>
        <div class="flex min-w-40 flex-col p-1" role="menu">
          <p class="truncate px-2 py-1.5 text-xs text-muted" translate="no">
            {{ user.email }}
          </p>
          <UButton
            color="error"
            variant="ghost"
            icon="i-fluent-sign-out-24-regular"
            class="justify-start"
            role="menuitem"
            :label="loggingOut ? $t('page.home.loggingOut') : $t('page.home.logout')"
            :loading="loggingOut"
            :disabled="loggingOut"
            @click="onLogout"
          />
        </div>
      </template>
    </UPopover>
  </aside>
</template>
