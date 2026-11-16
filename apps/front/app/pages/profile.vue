<script setup lang="ts">
import * as z from "zod";
import type { MenuItem } from "@sarpbc/design";
import type { AppNotification } from "@sarpbc/types";
import { getApiErrorMessage, isStaffUser } from "@sarpbc/utils";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const user = useUser();
const localePath = useLocalePath();
const posthog = usePostHog();
const toast = useToast();
const config = useRuntimeConfig();
const { refresh: refreshUnreadCount } = useUnreadNotificationCount();

if (!user.value) {
  navigateTo(localePath("/login"));
}

const isLoggingOut = ref(false);
const isMarkingRead = ref(false);
const isSavingUserName = ref(false);
const editOpen = ref(false);

const usernameSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, t("page.profile.username.validation.minLength"))
    .max(100, t("page.profile.username.validation.maxLength")),
});

type UsernameSchema = z.output<typeof usernameSchema>;

const usernameState = reactive<UsernameSchema>({
  userName: user.value?.userName ?? "",
});

watch(
  () => user.value?.userName,
  (userName) => {
    if (userName && !isSavingUserName.value) {
      usernameState.userName = userName;
    }
  },
);

watch(editOpen, (isOpen) => {
  if (isOpen) {
    usernameState.userName = user.value?.userName ?? "";
  }
});

const adminHomeUrl = computed(() => config.public.adminUrl.replace(/\/$/u, ""));

const showStaffConsole = computed(() => isStaffUser(user.value));

const staffMode = useStaffMode();

const { data: notifications, refresh: refreshNotifications } = await useLazyAsyncData(
  "profile-notifications",
  () => getNotifications(30),
  { server: false },
);

const hasNotifications = computed(() => (notifications.value?.length ?? 0) > 0);

const unreadNotifications = computed(
  () => notifications.value?.filter((notification) => !notification.readAt) ?? [],
);

const notificationMessage = (notification: AppNotification): string =>
  t("page.profile.notifications.replied", {
    target: notification.targetLabel,
    user: notification.reply.author.userName,
  });

const { errors: usernameErrors, markSubmitted: markUsernameSubmitted } = useFormErrors(
  usernameSchema,
  usernameState,
);

const saveUserName = async () => {
  if (isSavingUserName.value) {
    return;
  }

  markUsernameSubmitted();

  const parsed = usernameSchema.safeParse(usernameState);

  if (!parsed.success) {
    return;
  }

  isSavingUserName.value = true;

  try {
    const updated = await updateUserName(parsed.data.userName);
    user.value = updated;
    usernameState.userName = updated.userName;
    editOpen.value = false;
    toast.add({
      color: "success",
      title: t("page.profile.username.updated"),
    });
  } catch (error) {
    toast.add({
      color: "danger",
      title: getApiErrorMessage(error) ?? t("page.profile.username.updateFailed"),
    });
  } finally {
    isSavingUserName.value = false;
  }
};

const markAllRead = async () => {
  if (isMarkingRead.value || unreadNotifications.value.length === 0) {
    return;
  }

  isMarkingRead.value = true;

  try {
    await markNotificationsRead();
    await Promise.all([refreshNotifications(), refreshUnreadCount()]);
  } finally {
    isMarkingRead.value = false;
  }
};

const onNotificationClick = async (notification: AppNotification) => {
  if (notification.readAt) {
    return;
  }

  await markNotificationsRead([notification.id]);
  await Promise.all([refreshNotifications(), refreshUnreadCount()]);
};

const handleLogout = async () => {
  isLoggingOut.value = true;

  try {
    posthog?.capture("user_logged_out");
    await logout();
  } catch {
    toast.add({ color: "danger", title: t("page.profile.logoutFailed") });
  } finally {
    isLoggingOut.value = false;
    navigateTo(localePath("/"));
  }
};

const profileActions = computed<MenuItem[][]>(() => [
  [
    {
      icon: "i-fluent-edit-24-regular",
      label: t("page.profile.editProfile"),
      onSelect: () => (editOpen.value = true),
    },
    ...(showStaffConsole.value
      ? [
          {
            icon: "i-fluent-shield-24-regular",
            label: t("page.profile.staff"),
            onSelect: () => window.open(adminHomeUrl.value, "_blank", "noopener"),
          },
        ]
      : []),
  ],
  [
    {
      danger: true,
      disabled: isLoggingOut.value,
      icon: "i-fluent-sign-out-24-regular",
      label: t("page.profile.logout"),
      onSelect: handleLogout,
    },
  ],
]);

setPageSeo({
  description: t("page.profile.description"),
  noIndex: true,
  title: `${t("page.profile.title")} | sarpbc.org`,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ $t("page.profile.title") }}</template>
    </HubPageHeader>

    <div v-if="user" class="w-full flex flex-col">
      <HubCard
        class="min-h-row-double w-full flex flex-row justify-between items-center px-2 gap-2"
      >
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <SAvatar :src="user.avatarUrl" :alt="user.userName" size="lg" />
            <div class="min-w-0">
              <p class="truncate text-base font-medium text-highlighted" translate="no">
                {{ user.userName }}
              </p>
              <p class="truncate text-sm text-muted" translate="no">{{ user.email }}</p>
            </div>
          </div>
        </div>

        <SDropdownMenu :items="profileActions" align="end">
          <SButton
            variant="tertiary"
            icon="i-fluent-more-vertical-24-regular"
            sound="press"
            :aria-label="$t('page.profile.actions')"
          />
        </SDropdownMenu>
      </HubCard>

      <HubRail v-if="showStaffConsole" :title="$t('page.profile.staffMode.title')">
        <HubCard>
          <HubListItem>
            <SSwitch
              id="staff-mode"
              :model-value="staffMode.enabled.value"
              :label="$t('page.profile.staffMode.label')"
              :description="$t('page.profile.staffMode.description')"
              @update:model-value="staffMode.setEnabled"
            />
          </HubListItem>
        </HubCard>
      </HubRail>

      <HubRail v-if="hasNotifications">
        <template #caption>
          <div class="flex w-full min-w-0 items-center justify-between gap-2 pr-2">
            <h2>{{ $t("page.profile.notifications.title") }}</h2>
            <SButton
              v-if="unreadNotifications.length > 0"
              variant="tertiary"
              size="sm"
              :label="$t('page.profile.notifications.markAllRead')"
              :loading="isMarkingRead"
              :disabled="isMarkingRead"
              @click="markAllRead"
            />
          </div>
        </template>

        <HubCard>
          <HubListItem
            v-for="notification in notifications"
            :key="notification.id"
            :to="localePath(notification.targetPath)"
            :class="{ 'bg-elevated': !notification.readAt }"
            @click="onNotificationClick(notification)"
          >
            <div class="flex w-full min-w-0 items-center justify-between gap-2">
              <p class="min-w-0 truncate text-sm" translate="no">
                {{ notificationMessage(notification) }}
              </p>
              <span class="shrink-0 text-xs text-muted tabular-nums">
                {{ longDateTimeFormatter(locale).format(new Date(notification.createdAt)) }}
              </span>
            </div>
          </HubListItem>
        </HubCard>
      </HubRail>
    </div>

    <SModal
      v-if="user"
      v-model:open="editOpen"
      :title="$t('page.profile.editProfile')"
      :dismissible="!isSavingUserName"
    >
      <template #body>
        <form id="edit-username-form" class="w-full" novalidate @submit.prevent="saveUserName">
          <SFormField
            :label="$t('page.profile.username.label')"
            :error="usernameErrors.userName"
            required
            class="w-full"
          >
            <SInput
              v-model="usernameState.userName"
              type="text"
              autocomplete="username"
              spellcheck="false"
              class="w-full"
              :disabled="isSavingUserName"
            />
          </SFormField>
        </form>
      </template>
      <template #footer>
        <SButton
          type="submit"
          form="edit-username-form"
          :loading="isSavingUserName"
          :disabled="isSavingUserName"
          :label="
            isSavingUserName ? $t('page.profile.username.saving') : $t('page.profile.username.save')
          "
        />
      </template>
    </SModal>
  </div>
</template>
