<script lang="ts" setup>
import { hasPermission } from "~/utils/staff";

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const user = useUser();

const items = [
  {
    label: t("page.nav.home"),
  },
];

const canNews = computed(() => hasPermission(user.value, "news.manage"));
const canPlayers = computed(() => hasPermission(user.value, "players.manage"));
const canTeams = computed(() => hasPermission(user.value, "teams.manage"));
const canTournaments = computed(() => hasPermission(user.value, "tournaments.manage"));
const canPickems = computed(() => hasPermission(user.value, "pickems.manage"));
const canForum = computed(() => hasPermission(user.value, "forum.moderate"));

const hasAnyTool = computed(
  () =>
    canNews.value ||
    canPlayers.value ||
    canTeams.value ||
    canTournaments.value ||
    canPickems.value ||
    canForum.value,
);

onMounted(() => {
  if (route.query.forbidden === "1") {
    toast.add({
      title: t("page.home.forbidden"),
      color: "warning",
    });
    const query = { ...route.query };
    delete query.forbidden;
    void router.replace({ path: route.path, query });
  }
});
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="items" />
    </template>
    <DashboardContent>
      <div class="mx-auto max-w-3xl py-8">
        <img
          src="/sarpbc.svg"
          :alt="$t('page.home.logoAlt')"
          width="48"
          height="48"
          decoding="async"
          class="size-12 bg-transparent"
        />
        <p class="mt-3 text-sm font-medium text-muted">{{ $t("page.home.brand") }}</p>
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

        <p v-if="!hasAnyTool" class="mt-6 text-sm text-muted">
          {{ $t("page.home.noTools") }}
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <UButton v-if="canNews" :to="localePath('/news')" icon="i-fluent-news-24-regular">
            {{ $t("page.home.openNews") }}
          </UButton>
          <UButton
            v-if="canPlayers"
            :to="localePath('/players')"
            icon="i-fluent-person-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openPlayers") }}
          </UButton>
          <UButton
            v-if="canTeams"
            :to="localePath('/teams')"
            icon="i-fluent-people-team-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openTeams") }}
          </UButton>
          <UButton
            v-if="canTournaments"
            :to="localePath('/tournaments')"
            icon="i-fluent-trophy-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openTournaments") }}
          </UButton>
          <UButton
            v-if="canPickems"
            :to="localePath('/pickems')"
            icon="i-fluent-predictions-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openPickems") }}
          </UButton>
          <UButton
            v-if="canForum"
            :to="localePath('/forum')"
            icon="i-fluent-chat-24-regular"
            color="neutral"
          >
            {{ $t("page.home.openForum") }}
          </UButton>
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
