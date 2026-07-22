<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();
const pending = ref(false);

const items = [
  {
    label: t("page.nav.home"),
  },
];

async function onLogout() {
  if (pending.value) {
    return;
  }
  pending.value = true;
  try {
    await logout();
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <template #action>
      <UButton
        color="neutral"
        variant="outline"
        :loading="pending"
        :disabled="pending"
        @click="onLogout"
      >
        {{ pending ? $t("page.home.loggingOut") : $t("page.home.logout") }}
      </UButton>
    </template>

    <DashboardContent>
      <div class="mx-auto max-w-3xl py-8">
        <p class="text-sm font-medium text-muted">{{ $t("page.home.brand") }}</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight">
          {{ $t("page.home.title") }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ $t("page.home.subtitle") }}
        </p>

        <div class="mt-8 border border-default p-4">
          <p class="text-sm text-muted">{{ $t("page.home.signedInAs") }}</p>
          <p class="mt-1 font-medium" translate="no">{{ user?.userName }}</p>
          <p class="text-sm text-muted" translate="no">{{ user?.email }}</p>
        </div>

        <div class="mt-6">
          <UButton :to="localePath('/news')" icon="i-fluent-news-24-regular">
            {{ $t("page.home.openNews") }}
          </UButton>
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
