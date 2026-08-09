<script setup lang="ts">
import type { StaffPermission } from "~/types/user";
import { hasPermission } from "~/utils/staff";

const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();

const links = computed(() => {
  const all: {
    label: string;
    icon: string;
    to: string;
    target?: string;
    permission?: StaffPermission;
  }[] = [
    {
      label: t("page.nav.home"),
      icon: "i-fluent-home-24-regular",
      to: localePath("/"),
    },
    {
      label: t("page.nav.articles"),
      icon: "i-fluent-news-24-regular",
      to: localePath("/news"),
      permission: "news.manage",
    },
    {
      label: t("page.nav.players"),
      icon: "i-fluent-person-24-regular",
      to: localePath("/players"),
      permission: "players.manage",
    },
    {
      label: t("page.nav.teams"),
      icon: "i-fluent-people-team-24-regular",
      to: localePath("/teams"),
      permission: "teams.manage",
    },
    {
      label: t("page.nav.tournaments"),
      icon: "i-fluent-trophy-24-regular",
      to: localePath("/tournaments"),
      permission: "tournaments.manage",
    },
    {
      label: t("page.nav.pickems"),
      icon: "i-fluent-predictions-24-regular",
      to: localePath("/pickems"),
      permission: "pickems.manage",
    },
    {
      label: t("page.nav.forum"),
      icon: "i-fluent-chat-24-regular",
      to: localePath("/forum"),
      permission: "forum.moderate",
    },
    {
      label: t("page.nav.moderation"),
      icon: "i-fluent-shield-24-regular",
      to: localePath("/moderation"),
      permission: "forum.moderate",
    },
    {
      label: t("page.nav.tokens"),
      icon: "i-fluent-key-24-regular",
      to: localePath("/tokens"),
    },
    {
      label: t("page.nav.backToSite"),
      icon: "i-fluent-arrow-left-24-regular",
      to: "https://sarpbc.org",
      target: "_blank",
    },
  ];

  return all.filter((link) => {
    if (!link.permission) {
      return true;
    }
    return hasPermission(user.value, link.permission);
  });
});
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
