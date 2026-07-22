<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const links = computed(() => [
  {
    label: t("page.nav.home"),
    icon: "i-fluent-home-24-regular",
    to: localePath("/"),
  },
  {
    label: t("page.nav.articles"),
    icon: "i-fluent-news-24-regular",
    to: localePath("/news"),
  },
  {
    label: t("page.nav.players"),
    icon: "i-fluent-person-24-regular",
    to: localePath("/players"),
  },
  {
    label: t("page.nav.teams"),
    icon: "i-fluent-people-team-24-regular",
    to: localePath("/teams"),
  },
  {
    label: t("page.nav.backToSite"),
    icon: "i-fluent-arrow-left-24-regular",
    to: "https://sarpbc.org",
    target: "_blank",
  },
]);
</script>

<template>
  <div class="flex min-w-52 flex-col border-r border-default p-2">
    <UNavigationMenu
      orientation="vertical"
      :items="links"
      class="data-[orientation=vertical]:w-full"
    />
  </div>
</template>
