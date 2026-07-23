import type { StaffPermission } from "~/types/user";

export { isStaffUser, hasPermission, canModerateComments } from "@sarpbc/utils";

/** Map admin SPA path prefixes to required permissions. Home is staff-only. */
export function permissionForAdminPath(path: string): StaffPermission | "staff" | null {
  const normalized = path.replace(/\/$/, "") || "/";
  const withoutLocale = normalized.replace(/^\/fr(?=\/|$)/, "") || "/";

  if (withoutLocale === "/" || withoutLocale === "/login") {
    return withoutLocale === "/login" ? null : "staff";
  }

  if (withoutLocale === "/news" || withoutLocale.startsWith("/news/")) {
    return "news.manage";
  }
  if (withoutLocale === "/forum" || withoutLocale.startsWith("/forum/")) {
    return "forum.moderate";
  }
  if (withoutLocale === "/players" || withoutLocale.startsWith("/players/")) {
    return "players.manage";
  }
  if (withoutLocale === "/teams" || withoutLocale.startsWith("/teams/")) {
    return "teams.manage";
  }
  if (withoutLocale === "/tournaments" || withoutLocale.startsWith("/tournaments/")) {
    return "tournaments.manage";
  }
  if (withoutLocale === "/pickems" || withoutLocale.startsWith("/pickems/")) {
    return "pickems.manage";
  }

  return "staff";
}
