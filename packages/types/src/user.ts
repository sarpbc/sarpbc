export type StaffRole = "admin" | "moderator" | "journalist";

export type StaffPermission =
  | "news.manage"
  | "images.manage"
  | "forum.moderate"
  | "players.manage"
  | "teams.manage"
  | "tournaments.manage"
  | "pickems.manage";

export interface User {
  id: string;

  role?: StaffRole | null;

  permissions?: StaffPermission[];

  /** Derived from `role === "admin"`, not a separate assignment. */
  admin?: boolean;

  email: string;

  userName: string;

  avatarUrl: string | null;
}
