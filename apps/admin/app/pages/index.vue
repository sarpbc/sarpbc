<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();
const pending = ref(false);
const syncing = ref(false);

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

async function onSyncTeams() {
  if (syncing.value) {
    return;
  }
  syncing.value = true;
  try {
    await syncTeamFromPandascore();
  } finally {
    syncing.value = false;
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

        <div class="mt-6 flex flex-wrap gap-3">
          <UButton :to="localePath('/news')" icon="i-fluent-news-24-regular">
            {{ $t("page.home.openNews") }}
          </UButton>
          <UButton :to="localePath('/players')" icon="i-fluent-person-24-regular" color="neutral">
            {{ $t("page.home.openPlayers") }}
          </UButton>
          <UButton
            :to="localePath('/teams')"
            icon="i-fluent-people-team-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openTeams") }}
          </UButton>
          <UButton
            :to="localePath('/tournaments')"
            icon="i-fluent-trophy-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openTournaments") }}
          </UButton>
          <UButton
            :to="localePath('/pickems')"
            icon="i-fluent-predictions-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openPickems") }}
          </UButton>
          <UButton
            icon="i-fluent-arrow-sync-24-regular"
            color="neutral"
            variant="outline"
            :loading="syncing"
            :disabled="syncing"
            @click="onSyncTeams"
          >
            {{ syncing ? $t("page.home.syncingTeams") : $t("page.home.syncTeams") }}
          </UButton>
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
