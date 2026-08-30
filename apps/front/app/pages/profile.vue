<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { AppNotification } from "~/types/notification";
import { getApiErrorMessage } from "~/utils/apiError";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const user = useUser();
const localePath = useLocalePath();
const posthog = usePostHog();
const { identifyUser } = usePostHogIdentity();
const toast = useToast();
const config = useRuntimeConfig();
const { refresh: refreshUnreadCount } = useUnreadNotificationCount();

if (!user.value) {
  navigateTo(localePath("/login"));
}

const isLoggingOut = ref(false);
const isMarkingRead = ref(false);
const isSavingUserName = ref(false);
const menuOpen = ref(false);
const editOpen = ref(false);
const menuId = "profile-actions-menu";

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

const hasNotifications = computed(() => (notifications.value?.length ?? 0) > 0);

const unreadNotifications = computed(
  () => notifications.value?.filter((notification) => !notification.readAt) ?? [],
);

function notificationMessage(notification: AppNotification): string {
  return t("page.profile.notifications.replied", {
    user: notification.reply.author.userName,
    target: notification.targetLabel,
  });
}

async function saveUserName(event: FormSubmitEvent<UsernameSchema>) {
  event.preventDefault();
  if (isSavingUserName.value) {
    return;
  }

  const parsed = usernameSchema.safeParse(usernameState);
  if (!parsed.success) {
    return;
  }

  isSavingUserName.value = true;
  try {
    const updated = await updateUserName(parsed.data.userName);
    user.value = updated;
    usernameState.userName = updated.userName;
    identifyUser(updated);
    editOpen.value = false;
    toast.add({
      title: t("page.profile.username.updated"),
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.profile.username.updateFailed"),
      color: "error",
    });
  } finally {
    isSavingUserName.value = false;
  }
}

async function markAllRead() {
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
}

async function onNotificationClick(notification: AppNotification) {
  if (notification.readAt) {
    return;
  }

  await markNotificationsRead([notification.id]);
  await Promise.all([refreshNotifications(), refreshUnreadCount()]);
}

function openEditProfile() {
  menuOpen.value = false;
  editOpen.value = true;
}

const handleLogout = async () => {
  menuOpen.value = false;
  isLoggingOut.value = true;
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
    <SHubPageHeader>
      <template #title>{{ $t("page.profile.title") }}</template>
    </SHubPageHeader>

    <SCard
      v-if="user"
      class="min-h-row-double w-full flex flex-row justify-between items-center px-2 gap-2"
    >
      <div class="min-w-0">
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

      <UPopover v-model:open="menuOpen">
        <SButton
          square
          variant="ghost"
          color="neutral"
          icon="i-fluent-more-vertical-24-regular"
          class="size-row p-0 justify-center"
          sound="press"
          :aria-label="$t('page.profile.actions')"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          :aria-controls="menuId"
        />
        <template #content>
          <div
            :id="menuId"
            role="menu"
            class="flex min-w-40 flex-col p-1"
            :aria-label="$t('page.profile.actions')"
          >
            <SButton
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-fluent-edit-24-regular"
              class="justify-start"
              sound="press"
              role="menuitem"
              :label="$t('page.profile.editProfile')"
              @click="openEditProfile"
            />
            <SButton
              v-if="showStaffConsole"
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-fluent-shield-24-regular"
              class="justify-start"
              sound="press"
              role="menuitem"
              :to="adminHomeUrl"
              external
              target="_blank"
              :label="$t('page.profile.staff')"
              @click="menuOpen = false"
            />
            <SButton
              size="sm"
              variant="ghost"
              color="error"
              icon="i-fluent-sign-out-24-regular"
              class="justify-start"
              sound="press"
              role="menuitem"
              :label="$t('page.profile.logout')"
              :loading="isLoggingOut"
              :disabled="isLoggingOut"
              @click="handleLogout"
            />
          </div>
        </template>
      </UPopover>
    </SCard>

    <UModal
      v-if="user"
      v-model:open="editOpen"
      :title="$t('page.profile.editProfile')"
      :dismissible="!isSavingUserName"
    >
      <template #body>
        <UForm
          id="edit-username-form"
          :schema="usernameSchema"
          :state="usernameState"
          class="w-full"
          @submit="saveUserName"
        >
          <UFormField
            :label="$t('page.profile.username.label')"
            name="userName"
            required
            class="w-full"
          >
            <UInput
              v-model="usernameState.userName"
              type="text"
              autocomplete="username"
              spellcheck="false"
              class="w-full"
              :disabled="isSavingUserName"
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <SButton
          type="submit"
          form="edit-username-form"
          color="primary"
          variant="soft"
          :loading="isSavingUserName"
          :disabled="isSavingUserName"
          :label="
            isSavingUserName ? $t('page.profile.username.saving') : $t('page.profile.username.save')
          "
        />
      </template>
    </UModal>

    <SRail v-if="hasNotifications">
      <template #caption>
        <div class="flex w-full min-w-0 items-center justify-between gap-2 pr-2">
          <span>{{ $t("page.profile.notifications.title") }}</span>
          <SButton
            v-if="unreadNotifications.length > 0"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="$t('page.profile.notifications.markAllRead')"
            :loading="isMarkingRead"
            :disabled="isMarkingRead"
            @click="markAllRead"
          />
        </div>
      </template>

      <SCard flush-bottom>
        <SListItem
          v-for="notification in notifications"
          :key="notification.id"
          divider
          :to="localePath(notification.targetPath)"
          :class="{ 'bg-elevated': !notification.readAt }"
          @click="onNotificationClick(notification)"
        >
          <div class="flex w-full min-w-0 items-center justify-between gap-2">
            <p class="min-w-0 truncate text-sm" translate="no">
              {{ notificationMessage(notification) }}
            </p>
            <span class="shrink-0 text-xs text-muted tabular-nums">
              {{ df(locale).format(new Date(notification.createdAt)) }}
            </span>
          </div>
        </SListItem>
      </SCard>
    </SRail>
  </div>
</template>
