<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const links = [
  {
    label: t("page.dashboard.nav.home"),
    icon: "i-fluent-home-24-regular",
    to: localePath("/dashboard"),
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
    label: t("page.dashboard.nav.pickems"),
    icon: "i-fluent-clipboard-data-bar-24-regular",
    to: localePath("/dashboard/pickems"),
  },
  {
    label: t("page.dashboard.nav.news"),
    icon: "i-fluent-news-24-regular",
    to: localePath("/dashboard/news"),
  },
];
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
