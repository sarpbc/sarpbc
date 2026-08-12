<script setup lang="ts">
import type { AppNotification } from "~/types/notification";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const user = useUser();
const localePath = useLocalePath();
const posthog = usePostHog();
const config = useRuntimeConfig();
const { attrs: cuelumeAttrs, pressClass, playCue } = useCuelume();
const { refresh: refreshUnreadCount } = useUnreadNotificationCount();

if (!user.value) {
  navigateTo(localePath("/login"));
}

const isLoggingOut = ref(false);
const isMarkingRead = ref(false);
const adminHomeUrl = computed(() => {
  const base = String(config.public.adminUrl || "https://admin.sarpbc.org").replace(/\/$/, "");
  return base;
});

const showStaffConsole = computed(() => isStaffUser(user.value));

const { data: notifications, refresh: refreshNotifications } = await useLazyAsyncData(
  "profile-notifications",
  () => getNotifications(30),
  { server: false },
);

const unreadNotifications = computed(
  () => notifications.value?.filter((notification) => !notification.readAt) ?? [],
);

function notificationMessage(notification: AppNotification): string {
  return t("page.profile.notifications.replied", {
    user: notification.reply.author.userName,
    target: notification.targetLabel,
  });
}

async function markAllRead() {
  if (isMarkingRead.value || unreadNotifications.value.length === 0) {
    return;
  }

  isMarkingRead.value = true;
  playCue("loading");
  try {
    await markNotificationsRead();
    await Promise.all([refreshNotifications(), refreshUnreadCount()]);
  } finally {
    isMarkingRead.value = false;
  }
}

async function viewThread(notification: AppNotification) {
  if (!notification.readAt) {
    await markNotificationsRead([notification.id]);
    await Promise.all([refreshNotifications(), refreshUnreadCount()]);
  }

  await navigateTo(localePath(notification.targetPath));
}

const handleLogout = async () => {
  isLoggingOut.value = true;
  playCue("loading");
  try {
    posthog?.capture("user_logged_out");
    posthog?.reset();
    await logout();
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    isLoggingOut.value = false;
    navigateTo(localePath("/"));
  }
};

setPageSeo({
  title: `${t("page.profile.title")} | sarpbc.org`,
  description: t("page.profile.description"),
  noIndex: true,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SCrossCard class="h-row-header">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ $t("page.profile.title") }}
        </h1>
      </div>
    </SCrossCard>

    <SCard
      v-if="user"
      class="min-h-22.75 w-full flex flex-col lg:flex-row justify-between items-start lg:items-center p-2 lg:p-4 gap-4"
    >
      <div class="flex items-center gap-4">
        <UUser
          :alt="user.userName"
          :name="user.userName"
          :description="user.email"
          :avatar="{
            src: user.avatarUrl || undefined,
          }"
          size="xl"
        />
      </div>

      <div class="flex flex-row items-center gap-2">
        <UButton
          v-if="showStaffConsole"
          :to="adminHomeUrl"
          external
          target="_blank"
          color="primary"
          variant="soft"
          :label="$t('page.profile.openAdmin')"
          class="cursor-pointer w-fit"
          :class="pressClass"
          v-bind="cuelumeAttrs.pressRelease"
        />
        <UButton
          color="error"
          variant="soft"
          icon="i-fluent-sign-out-24-regular"
          class="cursor-pointer w-fit"
          :class="pressClass"
          :label="$t('page.profile.logout')"
          :loading="isLoggingOut"
          :disabled="isLoggingOut"
          v-bind="cuelumeAttrs.pressRelease"
          @click="handleLogout"
        />
      </div>
    </SCard>

    <SCard class="w-full flex flex-col gap-4 p-4">
      <div class="flex flex-row items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">
          {{ $t("page.profile.notifications.title") }}
        </h2>
        <UButton
          v-if="unreadNotifications.length > 0"
          size="sm"
          variant="soft"
          color="neutral"
          :label="$t('page.profile.notifications.markAllRead')"
          :loading="isMarkingRead"
          :disabled="isMarkingRead"
          class="cursor-pointer"
          :class="pressClass"
          v-bind="cuelumeAttrs.pressRelease"
          @click="markAllRead"
        />
      </div>

      <p v-if="!notifications?.length" class="text-sm text-muted">
        {{ $t("page.profile.notifications.empty") }}
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="flex flex-col gap-1 border border-default p-3"
          :class="{ 'bg-elevated': !notification.readAt }"
        >
          <p class="text-sm">
            <span class="font-medium" translate="no">
              {{ notificationMessage(notification) }}
            </span>
          </p>
          <p class="text-sm text-muted line-clamp-2">{{ notification.reply.content }}</p>
          <div class="flex flex-row items-center justify-between gap-2 text-sm">
            <span class="text-muted tabular-nums">
              {{ df(locale).format(new Date(notification.createdAt)) }}
            </span>
            <UButton
              variant="link"
              color="primary"
              :label="$t('page.profile.notifications.viewThread')"
              class="cursor-pointer p-0"
              @click="viewThread(notification)"
            />
          </div>
        </li>
      </ul>
    </SCard>
  </div>
</template>
