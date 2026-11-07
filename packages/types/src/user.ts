export const STAFF_ROLES = ["admin", "moderator", "journalist"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_PERMISSIONS = [
  "news.manage",
  "images.manage",
  "forum.moderate",
  "players.manage",
  "teams.manage",
  "tournaments.manage",
  "pickems.manage",
  "users.manage",
  "streamers.manage",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export interface User {
  id: string;
  email: string;
  userName: string;
  avatarUrl?: string;
  role?: StaffRole;
  permissions?: StaffPermission[];
}

export interface UserListItem {
  id: string;
  email: string;
  userName: string;
  avatarUrl: string | null;
  role: StaffRole | null;
  createdAt: string;
}

export interface UserList {
  users: UserListItem[];
  total: number;
}
