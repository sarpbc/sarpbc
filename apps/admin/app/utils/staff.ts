import { hasPermission } from "@sarpbc/utils";
import type { StaffPermission, User } from "~/types/user";

export { isStaffUser, hasPermission, canModerateComments } from "@sarpbc/utils";

export type PermissionRequirement = StaffPermission | readonly StaffPermission[];

export const ROSTER_PROPOSAL_PERMISSIONS = [
  "players.manage",
  "teams.manage",
  "tournaments.manage",
] as const;

export function meetsRequirement(
  user: User | null | undefined,
  required: PermissionRequirement,
): boolean {
  return typeof required === "string"
    ? hasPermission(user, required)
    : required.some((permission) => hasPermission(user, permission));
}

/** Home (`/`) is staff-only — any staff role, no specific permission. */
export function permissionForAdminPath(path: string): PermissionRequirement | "staff" | null {
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
  if (withoutLocale === "/moderation" || withoutLocale.startsWith("/moderation/")) {
    return "forum.moderate";
  }
  if (withoutLocale === "/proposals" || withoutLocale.startsWith("/proposals/")) {
    return ROSTER_PROPOSAL_PERMISSIONS;
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
  if (withoutLocale === "/users" || withoutLocale.startsWith("/users/")) {
    return "users.manage";
  }
  if (withoutLocale === "/pickems" || withoutLocale.startsWith("/pickems/")) {
    return "pickems.manage";
  }

  return "staff";
}
