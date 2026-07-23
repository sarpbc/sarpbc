<script setup lang="ts">
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const user = useUser();
const localePath = useLocalePath();
const posthog = usePostHog();
const config = useRuntimeConfig();

if (!user.value) {
  navigateTo(localePath("/login"));
}

const isLoggingOut = ref(false);
const adminHomeUrl = computed(() => {
  const base = String(config.public.adminUrl || "https://admin.sarpbc.org").replace(/\/$/, "");
  return base;
});

const handleLogout = async () => {
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
  description: "Manage your sarpbc.org profile and settings",
  noIndex: true,
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="h-14">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold">
          {{ $t("page.profile.title") }}
        </h1>
      </div>
    </UiCrossCard>

    <UiCard
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
          v-if="user.admin"
          :to="adminHomeUrl"
          external
          target="_blank"
          color="primary"
          variant="soft"
          :label="$t('page.profile.openAdmin')"
          class="cursor-pointer w-fit"
        />
        <UButton
          color="error"
          variant="soft"
          icon="i-fluent-sign-out-24-regular"
          class="cursor-pointer w-fit"
          :label="$t('page.profile.logout')"
          :loading="isLoggingOut"
          :disabled="isLoggingOut"
          @click="handleLogout"
        />
      </div>
    </UiCard>
  </div>
</template>
