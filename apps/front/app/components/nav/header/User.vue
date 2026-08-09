<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const { count: unreadCount } = useUnreadNotificationCount();
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
      <UBadge
        v-if="unreadCount > 0"
        color="error"
        variant="solid"
        size="xs"
        class="absolute -top-1 -right-2 min-w-4 justify-center tabular-nums"
        :aria-label="t('components.header.unreadNotifications', { count: unreadCount })"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </UBadge>
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
