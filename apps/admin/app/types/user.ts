import type { StaffRole } from "@sarpbc/types";

export type { StaffRole, StaffPermission, User } from "@sarpbc/types";

export const ASSIGNABLE_ROLES = ["member", "journalist", "moderator", "admin"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface AdminUser {
  id: string;
  email: string;
  userName: string;
  avatarUrl: string | null;
  role: StaffRole | null;
  createdAt: string;
}

export interface AdminUserList {
  users: AdminUser[];
  total: number;
}
