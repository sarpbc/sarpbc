<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const user = useUser();
const links = useAdminNavLinks();
const { loggingOut, logout } = useLogout();

const route = useRoute();

/* Following a link changes the route; the drawer has done its job. */
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <SbSlideover
    v-model:open="open"
    side="left"
    :title="$t('page.nav.admin')"
    :description="$t('page.nav.drawerDescription')"
  >
    <SbButton
      variant="tertiary"
      icon="i-fluent-navigation-24-regular"
      :aria-label="$t('page.nav.openMenu')"
      class="lg:hidden"
    />

    <template #body>
      <SbNavigationMenu
        orientation="vertical"
        :items="links"
        class="data-[orientation=vertical]:w-full"
      />
    </template>

    <template v-if="user" #footer>
      <div class="flex w-full min-w-0 flex-col gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <SbAvatar :src="user.avatarUrl ?? undefined" :alt="user.userName" size="xs" />
          <div class="min-w-0">
            <p class="truncate text-sm" translate="no">{{ user.userName }}</p>
            <p class="truncate text-xs text-muted" translate="no">{{ user.email }}</p>
          </div>
        </div>
        <SbButton
          variant="tertiary"
          danger
          icon="i-fluent-sign-out-24-regular"
          class="justify-start"
          :label="loggingOut ? $t('page.home.loggingOut') : $t('page.home.logout')"
          :loading="loggingOut"
          :disabled="loggingOut"
          @click="logout"
        />
      </div>
    </template>
  </SbSlideover>
</template>
