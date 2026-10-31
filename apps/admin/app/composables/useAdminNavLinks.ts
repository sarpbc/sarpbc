import {
  meetsRequirement,
  ROSTER_PROPOSAL_PERMISSIONS,
  type PermissionRequirement,
} from "~/utils/staff";

export interface AdminNavLink {
  label: string;
  icon: string;
  to: string;
  target?: string;
  permission?: PermissionRequirement;
}

export function useAdminNavLinks() {
  const { t } = useI18n();
  const localePath = useLocalePath();
  const user = useUser();
  const config = useRuntimeConfig();

  const publicSiteUrl = String(config.public.publicSiteUrl).replace(/\/$/, "");

  return computed(() => {
    const all: AdminNavLink[] = [
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
        label: t("page.nav.proposals"),
        icon: "i-fluent-clipboard-task-list-ltr-24-regular",
        to: localePath("/proposals"),
        permission: ROSTER_PROPOSAL_PERMISSIONS,
      },
      {
        label: t("page.nav.users"),
        icon: "i-fluent-people-24-regular",
        to: localePath("/users"),
        permission: "users.manage",
      },
      {
        label: t("page.nav.streamers"),
        icon: "i-fluent-live-24-regular",
        to: localePath("/streamers"),
        permission: "streamers.manage",
      },
      {
        label: t("page.nav.tokens"),
        icon: "i-fluent-key-24-regular",
        to: localePath("/tokens"),
      },
      {
        label: t("page.nav.backToSite"),
        icon: "i-fluent-arrow-left-24-regular",
        to: publicSiteUrl,
        target: "_blank",
      },
    ];

    return all.filter((link) => !link.permission || meetsRequirement(user.value, link.permission));
  });
}
