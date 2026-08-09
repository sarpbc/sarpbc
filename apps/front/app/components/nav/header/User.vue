<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const isClient = ref(false);
const { count: unreadCount } = useUnreadNotificationCount();

onMounted(() => {
  isClient.value = true;
});
</script>

<template>
  <ClientOnly>
    <ULink
      v-if="!user"
      :to="$localePath('/login')"
      class="text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
    >
      {{ t("components.header.signin") }}
    </ULink>
    <ULink
      v-else
      :to="$localePath('/profile')"
      class="relative truncate text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
    >
      {{ `${user.userName}` }}
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-2 min-w-4 rounded-full bg-error px-1 text-center text-[10px] leading-4 text-white tabular-nums"
        :aria-label="t('components.header.unreadNotifications', { count: unreadCount })"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </ULink>
    <template #fallback>
      <ULink
        :to="$localePath('/login')"
        class="text-muted hover:text-highlighted text-lg lg:text-sm font-semibold lg:font-normal"
      >
        {{ t("components.header.signin") }}
      </ULink>
    </template>
  </ClientOnly>
</template>
