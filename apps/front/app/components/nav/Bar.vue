<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const links = computed(() => [
  {
    label: t("page.dashboard.nav.home"),
    icon: "i-fluent-home-24-regular",
    to: localePath("/dashboard"),
  },
  {
    label: t("page.dashboard.nav.articles"),
    icon: "i-fluent-news-24-regular",
    to: localePath("/dashboard/news"),
  },
  {
    label: t("page.dashboard.nav.tournaments"),
    icon: "i-fluent-trophy-24-regular",
    to: localePath("/dashboard/tournaments"),
  },
  {
    label: t("page.dashboard.nav.players"),
    icon: "i-fluent-person-24-regular",
    to: localePath("/dashboard/players"),
  },
  {
    label: t("page.dashboard.nav.teams"),
    icon: "i-fluent-people-team-24-regular",
    to: localePath("/dashboard/teams"),
  },
  {
    label: t("page.dashboard.nav.forum"),
    icon: "i-fluent-chat-24-regular",
    to: localePath("/dashboard/forum"),
  },
  {
    label: t("page.dashboard.nav.backToSite"),
    icon: "i-fluent-arrow-left-24-regular",
    to: "https://sarpbc.org",
    target: "_blank",
  },
]);
</script>

<template>
  <div class="flex flex-col min-w-52 p-2 border-r border-default">
    <UNavigationMenu
      orientation="vertical"
      :items="links"
      class="data-[orientation=vertical]:w-full"
    />
  </div>
</template>
