<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const user = useUser();
const links = useAdminNavLinks();
const loggingOut = ref(false);

const items = computed(() =>
  links.value.map((link) => ({ ...link, onSelect: () => (open.value = false) })),
);

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
  <USlideover
    v-model:open="open"
    side="left"
    :title="$t('page.nav.admin')"
    :description="$t('page.nav.drawerDescription')"
    :ui="{ content: 'max-w-72' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-fluent-navigation-24-regular"
      :aria-label="$t('page.nav.openMenu')"
      class="lg:hidden"
    />

    <template #body>
      <UNavigationMenu
        orientation="vertical"
        :items="items"
        class="data-[orientation=vertical]:w-full"
      />
    </template>

    <template v-if="user" #footer>
      <div class="flex w-full min-w-0 flex-col gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <UAvatar :src="user.avatarUrl ?? undefined" :alt="user.userName" size="xs" />
          <div class="min-w-0">
            <p class="truncate text-sm" translate="no">{{ user.userName }}</p>
            <p class="truncate text-xs text-muted" translate="no">{{ user.email }}</p>
          </div>
        </div>
        <UButton
          color="error"
          variant="ghost"
          icon="i-fluent-sign-out-24-regular"
          class="justify-start"
          :label="loggingOut ? $t('page.home.loggingOut') : $t('page.home.logout')"
          :loading="loggingOut"
          :disabled="loggingOut"
          @click="onLogout"
        />
      </div>
    </template>
  </USlideover>
</template>
