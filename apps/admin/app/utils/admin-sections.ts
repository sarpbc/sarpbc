import type { StaffPermission, User } from "@sarpbc/types";
import { ROSTER_PROPOSAL_PERMISSIONS, hasPermission } from "@sarpbc/utils";

interface AdminSection {
  path: string;
  // WARNING: omitting permissions grants every staff member; a list grants any one of them.
  permissions?: readonly StaffPermission[];
  icon: string;
  label: string;
}

const ADMIN_SECTIONS = [
  {
    icon: "i-fluent-news-24-regular",
    label: "page.nav.articles",
    path: "/news",
    permissions: ["news.manage"],
  },
  {
    icon: "i-fluent-person-24-regular",
    label: "page.nav.players",
    path: "/players",
    permissions: ["players.manage"],
  },
  {
    icon: "i-fluent-people-team-24-regular",
    label: "page.nav.teams",
    path: "/teams",
    permissions: ["teams.manage"],
  },
  {
    icon: "i-fluent-trophy-24-regular",
    label: "page.nav.tournaments",
    path: "/tournaments",
    permissions: ["tournaments.manage"],
  },
  {
    icon: "i-fluent-text-bullet-list-ltr-24-regular",
    label: "page.nav.circuits",
    path: "/circuits",
    permissions: ["tournaments.manage"],
  },
  {
    icon: "i-fluent-ribbon-star-24-regular",
    label: "page.nav.seasons",
    path: "/seasons",
    permissions: ["tournaments.manage"],
  },
  {
    icon: "i-fluent-calendar-star-24-regular",
    label: "page.nav.onThisDay",
    path: "/on-this-day",
    permissions: ["tournaments.manage"],
  },
  {
    icon: "i-fluent-predictions-24-regular",
    label: "page.nav.pickems",
    path: "/pickems",
    permissions: ["pickems.manage"],
  },
  {
    icon: "i-fluent-chat-24-regular",
    label: "page.nav.forum",
    path: "/forum",
    permissions: ["forum.moderate"],
  },
  {
    icon: "i-fluent-shield-24-regular",
    label: "page.nav.moderation",
    path: "/moderation",
    permissions: ["forum.moderate"],
  },
  {
    icon: "i-fluent-clipboard-task-list-ltr-24-regular",
    label: "page.nav.proposals",
    path: "/proposals",
    permissions: ROSTER_PROPOSAL_PERMISSIONS,
  },
  {
    icon: "i-fluent-people-24-regular",
    label: "page.nav.users",
    path: "/users",
    permissions: ["users.manage"],
  },
  {
    icon: "i-fluent-live-24-regular",
    label: "page.nav.streamers",
    path: "/streamers",
    permissions: ["streamers.manage"],
  },
  {
    icon: "i-fluent-key-24-regular",
    label: "page.nav.tokens",
    path: "/tokens",
  },
] as const satisfies readonly AdminSection[];

export type AdminSectionPath = (typeof ADMIN_SECTIONS)[number]["path"];

const meetsSection = (user: User | null | undefined, section: AdminSection) =>
  !section.permissions || section.permissions.some((permission) => hasPermission(user, permission));

export const visibleAdminSections = (user: User | null | undefined) =>
  ADMIN_SECTIONS.filter((section) => meetsSection(user, section));

export const canAccessSection = (user: User | null | undefined, path: AdminSectionPath) =>
  visibleAdminSections(user).some((section) => section.path === path);

const adminSectionForRoute = (baseName: string | undefined) => {
  const root = baseName?.split("-")[0];

  return ADMIN_SECTIONS.find((section) => section.path === `/${root}`);
};

export const canAccessRoute = (user: User | null | undefined, baseName: string | undefined) => {
  const section = adminSectionForRoute(baseName);

  return !section || meetsSection(user, section);
};
