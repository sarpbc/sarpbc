<script lang="ts" setup>
const { t } = useI18n();

const user = useUser();
const { count: unreadCount } = useUnreadNotificationCount();
</script>

<template>
  <ClientOnly>
    <UiLink
      v-if="!user"
      :to="$localePath('/login')"
      variant="muted"
      class="text-lg md:text-sm font-semibold md:font-normal"
    >
      {{ t("components.header.signin") }}
    </UiLink>
    <UiLink
      v-else
      :to="$localePath('/profile')"
      variant="muted"
      class="relative truncate text-lg md:text-sm font-semibold md:font-normal"
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
    </UiLink>
    <template #fallback>
      <UiLink
        :to="$localePath('/login')"
        variant="muted"
        class="text-lg md:text-sm font-semibold md:font-normal"
      >
        {{ t("components.header.signin") }}
      </UiLink>
    </template>
  </ClientOnly>
</template>
