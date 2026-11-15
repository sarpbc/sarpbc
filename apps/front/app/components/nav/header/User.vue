<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const { count: unreadCount } = useUnreadNotificationCount();
</script>

<template>
  <ClientOnly>
    <SLink
      v-if="!user"
      :to="$localePath('/login')"
      variant="muted"
      class="text-lg md:text-sm font-medium md:font-normal"
    >
      {{ t("components.header.signin") }}
    </SLink>
    <SLink
      v-else
      :to="$localePath('/profile')"
      variant="muted"
      class="relative truncate text-lg md:text-sm font-medium md:font-normal"
    >
      {{ `${user.userName}` }}
      <SBadge
        v-if="unreadCount > 0"
        color="danger"
        class="absolute -top-1 -right-2 min-w-4 justify-center tabular-nums"
        :aria-label="t('components.header.unreadNotifications', { count: unreadCount })"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </SBadge>
    </SLink>
    <template #fallback>
      <SLink
        :to="$localePath('/login')"
        variant="muted"
        class="text-lg md:text-sm font-medium md:font-normal"
      >
        {{ t("components.header.signin") }}
      </SLink>
    </template>
  </ClientOnly>
</template>
