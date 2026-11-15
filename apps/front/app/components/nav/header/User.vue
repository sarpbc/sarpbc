<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const { count: unreadCount } = useUnreadNotificationCount();
</script>

<template>
  <ClientOnly>
    <SbLink
      v-if="!user"
      :to="$localePath('/login')"
      variant="muted"
      class="text-lg md:text-sm font-medium md:font-normal"
    >
      {{ t("components.header.signin") }}
    </SbLink>
    <SbLink
      v-else
      :to="$localePath('/profile')"
      variant="muted"
      class="relative truncate text-lg md:text-sm font-medium md:font-normal"
    >
      {{ `${user.userName}` }}
      <SbBadge
        v-if="unreadCount > 0"
        color="danger"
        class="absolute -top-1 -right-2 min-w-4 justify-center tabular-nums"
        :aria-label="t('components.header.unreadNotifications', { count: unreadCount })"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </SbBadge>
    </SbLink>
    <template #fallback>
      <SbLink
        :to="$localePath('/login')"
        variant="muted"
        class="text-lg md:text-sm font-medium md:font-normal"
      >
        {{ t("components.header.signin") }}
      </SbLink>
    </template>
  </ClientOnly>
</template>
